

const asyncHandler=(handleRequest)=>{return(req,res,next)=>{
    Promise.resolve(handleRequest(req,res,next))
    .catch((err)=>next(err))
}

}
export {asyncHandler}





/*const asyncHandler=(fn)=>async (req,res,next)=>{

    try{
    await fn(req,res,next)
    

}catch(err){
    res.status(err||500).json({
        sucess:false,
        message:err.message

    })
}
}
*/



