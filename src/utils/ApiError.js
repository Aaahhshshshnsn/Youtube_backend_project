class ApiError extends Error{
    connstructor(
        statusCode,
        errors=[],
        stack="",
        message="something went wrong"

    ){
            
        this.statusCode=statusCode;
        this.data=null;
        this.message=message;
        this.success=false;
        this.errors=errors;

        if(stack){
            this.stack=stack;
        }else{
            Error.captureStackTrace(this,this.constructor)
    }

}
}




export {ApiError}








