import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Get all videos with optional filters and pagination
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "desc", userId } = req.query;

    const filters = {};
    if (query) {
        filters.title = { $regex: query, $options: "i" };
    }
    if (userId && isValidObjectId(userId)) {
        filters.owner = userId;
    }

    const sortOptions = {
        [sortBy]: sortType === "asc" ? 1 : -1
    };

    const videos = await Video.find(filters)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("owner", "fullName username avatar");

    const total = await Video.countDocuments(filters);

    res.status(200).json(new ApiResponse(200, { videos, total }, "Videos fetched successfully"));
});

// Publish a new video
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const videoFile = req.files?.video;
    const thumbnailFile = req.files?.thumbnail;

    if (!videoFile || !title || !description) {
        throw new ApiError(400, "Missing required fields or video file");
    }

    const videoUpload = await uploadOnCloudinary(videoFile.tempFilePath, "video");
    const thumbnailUpload = thumbnailFile ? await uploadOnCloudinary(thumbnailFile.tempFilePath) : null;

    const newVideo = await Video.create({
        title,
        description,
        videoUrl: videoUpload.secure_url,
        thumbnailUrl: thumbnailUpload?.secure_url || "",
        duration: videoUpload.duration || 0,
        owner: req.user._id,
    });

    await User.findByIdAndUpdate(req.user._id, { $push: { videos: newVideo._id } });

    res.status(201).json(new ApiResponse(201, newVideo, "Video uploaded successfully"));
});

// Get video by ID
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId).populate("owner", "fullName username avatar");
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    res.status(200).json(new ApiResponse(200, video, "Video fetched successfully"));
});

// Update video details
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const thumbnailFile = req.files?.thumbnail;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (String(video.owner) !== String(req.user._id)) {
        throw new ApiError(403, "Unauthorized to update this video");
    }

    let thumbnailUrl = video.thumbnailUrl;
    if (thumbnailFile) {
        const thumbnailUpload = await uploadOnCloudinary(thumbnailFile.tempFilePath);
        thumbnailUrl = thumbnailUpload.secure_url;
    }

    video.title = title || video.title;
    video.description = description || video.description;
    video.thumbnailUrl = thumbnailUrl;

    await video.save();

    res.status(200).json(new ApiResponse(200, video, "Video updated successfully"));
});

// Delete a video
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (String(video.owner) !== String(req.user._id)) {
        throw new ApiError(403, "Unauthorized to delete this video");
    }

    await video.deleteOne();
    await User.findByIdAndUpdate(req.user._id, { $pull: { videos: video._id } });

    res.status(200).json(new ApiResponse(200, null, "Video deleted successfully"));
});

// Toggle publish/unpublish status
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (String(video.owner) !== String(req.user._id)) {
        throw new ApiError(403, "Unauthorized to update this video");
    }

    video.isPublished = !video.isPublished;
    await video.save();

    res.status(200).json(new ApiResponse(200, video, `Video ${video.isPublished ? "published" : "unpublished"} successfully`));
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
};
