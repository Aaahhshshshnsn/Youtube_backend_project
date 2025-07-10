import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import mongoose from "mongoose"
import jwt from "jsonwebtoken"



const generateAccessAndRefreshTokens = async(userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    
    console.log("User before save:", user);

    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }

  } catch (err) {
    throw new ApiError(500, "something went wrong while generating refresh token and acess token")

  }

}



const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  //check if user already exists:username,email
  //check for images,check for avatar
  //upload them to cloudinary,avatar
  //create user object-create entry in db
  //remove password and refresh token field from response
  //check for user creation 
  //return res

  const { fullName, username, email, password } = req.body


  if ([fullName, username, email, password].some((field) =>
    field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required")

  }
  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists")
  }


  //const avatarLocalPath= req.files?.avatar[0]?.path;
  //let coverImageLocalPath;
  //if(req.files&&Array.isArray(req.files.coverImage)&&req.files.coverImage.length>0){
  //coverImageLocalPath=req.files.coverImage[0].path
  //}

  //   if (!avatarLocalPath) {
  //   throw new ApiError(400, "Avatar file is required")
  // }

  // const avatar= await uploadOnCloudinary(avatarLocalPath)

  //if (!avatar) {
  //  throw new ApiError(500, "Avatar upload failed");
  // }


  const user = await User.create({
    fullName,
    password,
    username: username.toLowerCase(),
    email:email.toLowerCase(),
    //avatar:avatar.url,
    // coverImage: coverImage?.url || ""

  })
  const createdUser = await User.findById(user._id).select("-password -refreshToken")

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering the user")
  }


  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered sucessfully")
  )


})


const loginUser = asyncHandler(async (req, res) => {
  //reqbody-data
  //username or email
  //find the user,
  //password check
  //acess and refresh token
  //send cookies

  const { email, username, password } = req.body
 console.log("Login body:", req.body);

  if (!email && !username) {
    throw new ApiError(400, "username or email is required")
  }
  
    let query = {};
  if (username) {
    query.username = username.toLowerCase();
  } else if (email) {
    query.email = email.toLowerCase();
  }

  const user = await User.findOne(query);

 if (!user) {
   throw new ApiError(404, "User does not exist")
 }

 console.log("Fetched User for Login:", user);

  const isPasswordValid = await user.isPasswordCorrect(password)

   console.log("isPasswordValid:", isPasswordValid);



  if(!isPasswordValid) {
   throw new ApiError(401, "Invalid user credentials")
 }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)
  
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }
  return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, {
        user: loggedInUser, accessToken, refreshToken
      },
        "user loggednIn sucessfully"
      )
    )

})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken:1
      }

    }, {
    new: true
  }
  )

  const options = {
    httpOnly: true,
    secure: true
  }
  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out"));
})

const refreshAccessToken=asyncHandler(async(req,res)=>{
  //imncoming refreshTOken
  //dedodedTokem
  //fimd the user
  //checkincomingRefreshToken
  //cookies
  //generateaccessToken
  //return res

 const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken 
  if(!incomingRefreshToken){
    throw new ApiError(401,"Unauthorized request")
  }

  try{
 const decodedToken=jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  )
  const user=await User.findById(decodedToken?._id)
  if(!user){
    throw new ApiError(401,"Invalid refreshToken");
  }

  if(incomingRefreshToken!==user?.refreshToken){
    throw new ApiError(401,"RefreshToken is expired or used")
  }

  const options={
    httpOnly:true,
    secure:true
}
   const {accessToken,newRefreshToken}= await generateAccessAndRefreshTokens(user._id)

   return res
   .status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshToken",newRefreshToken,options)
   .json(
    new ApiResponse(200,
      {
        accessToken,refreshToken:newRefreshToken
      },
      "Access token refreshed"
    )
   )}catch(err){

      throw new ApiError(401,errors?.message||"Invalid refreshTOken")

   }

})

const changeCurrentPassword=asyncHandler(async(req,res)=>{
      //get user new password
      //get user form database
      //check password correct
      //new password field
      //save in the databasenew password
      //return response
  

  const{oldPassword,newPassword}=req.body

 // const user=await User.findById(req.user?._id)



    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Both oldPassword and newPassword are required");
    }
  
    // Fetch the user, explicitly including the password for comparison
    const user = await User.findById(req.user?._id).select('+password'); 

    if (!user) {
        throw new ApiError(404, "Authenticated user not found.");
    }

    const isPasswordCorrect= await user.isPasswordCorrect(oldPassword)

         if(!isPasswordCorrect){
          throw new ApiError(400,"Invalid old password")
         }
         user.password=newPassword
        await user.save({validateBeforeSave:false})

        return res.status(200).json(new ApiResponse(200,{},"password changed successfully"))


})


const getCurentUser=asyncHandler(async(req,res)=>{

 return res
 .status(200)
 .json(200,req.user,"current user fetched sucessfully")
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
  //get fullname or account details-req.body
  //find user and update remove 
  //send res

  const{fullName,email}=req.body

  if(!fullName || !email){
    throw new ApiError(200,"All fields are required")
  }

 const user=await User.findByIdAndUpdate(req.user?._id,
    {
      $set:{
        fullName,
        email
      }
    },
    
      {new:true }
  ).select("-password")
  return res.status(200)
  .json(new ApiResponse(200,user,"account details updated successfully"))
})

/*
  const updateUserAvatar=asyncHandler(async(req,res)=>{
  
  const avatarLocalPath= req.file?.path
  if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is missing")
  }
  const avatar=await uploadOnCloudinary(avatarLocalPath)
  if(!avatar.url){
    throw new ApiError(400,"Error while uploading on avatar")
  }
   const user=await User.findByIdAndUpdate(
    req.user?._id,{
    $set:{
              avatar:avatar.url
    }
   },{new:true}
   )
  .select("-password")

  return res
  .status(200)
  .json(
  new ApiResponse(200,user,"avtar Image updated successfully"))
})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
  const coverImageLocalPath=req.file?.Path
  if(!coverImageLocalPath){
    throw new ApiError(200,"coverImage image file missing")
  }

  const coverImage=await uploadOnCloudinary(coverImageLocalPath)
  if(!coverImage.url){
    throw new ApiError(200,"coverImage uploading error")
  }
const user=await User.findByIdAndUpdate(req.user?._id,
    {
      $set:{
        coverImage:coverImage.url
      }
    },{new:true}
  ).select("-password")

  
  return res
  .status(200)
  .json(
  new ApiResponse(200,user,"cover Image updated successfully"))
})
*/




const getUserChannelProfile=asyncHandler(async(req,res)=>{
  const{username}=req.params
  if(!username?.trim()){
    throw new ApiError(404,"username is missing")
  }
  const channel= await User.aggregate([
    {
    $match:{
      username:username?.toLowerCase()
    }

    },
    {
      $lookup:{
        from:"Subscription",
        localField:"_id",
        foreignField:"channel",
         as:"subscribers"
       }
  },{
    $lookup:{
       from:"Subscription",
        localField:"_id",
        foreignField:"subscriber",
        as:"subscribedTo"
        }
  },{
    $addFields:{
      subscribersCount:{
        $size:"$subscribers"
      },
      channelsSubscribedToCount:{
        $size:"$subscribedTo"
      },
      isSubscribed:{
        $cond:{
          if:{$in:[req.user?._id,"$subscribers.subscriber"]},
          then:true,
          else:false
        }
      }


    }
    
  },{
    $project:{
      fullName:1,
      username:1,
      subscribersCount:1,
      channelsSubscribedToCount:1,
      isSubscribed:1,
      email:1,
    }
  }
])
if(!channel?.length){
  throw new ApiError(404,"channel does not exists")

}
return res
.status(200)
.json(
  new ApiResponse(200,channel[0],"User channel fetched successfully")
)

})


const getWatchHistory=asyncHandler(async(req,res)=>{

  const user=await User.aggregate([
    {
      $match:{
        _id: new mongoose.Types.ObjectId(req.user._id)

      }

    },{
      $lookup:{
        from:"videos",
        localField:"watchHistory",
        foreignField:"_id",
        as:"watchHistory",
        pipeline:[
          {
            $lookup:{
              from:"users",
              localField:"owner",
              foreignField:"_id",
              as:"owner",
              pipeline:[
                {
                  $project:{
                    fullName:1,
                    username:1,
                    avatar:1
                  }
                }
              ]
            
            }
           
          },
          {
            $addFields:{
              owner:{
                $first:"$owner"
              }

            }
          }
        ]
      }
    }

    
  ])
  return res
  .status(200)
  .json(
    new ApiResponse(200,
      user[0].watchHistory,
    "watch historu fetched successfully")
  )

})



export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurentUser,
  updateAccountDetails,
  //updateUserAvatar,
 // updateUserCoverImage,
 getUserChannelProfile,
 getWatchHistory


}

