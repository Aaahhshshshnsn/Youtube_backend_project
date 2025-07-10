class ApiResponse{
    constructor(
        statusCode,
        data,
        message="Sucess"
    ){
        this.statusCode=statusCode  <400
        this.message=message
        this.data=data
        this.sucess=statusCode <400
    }
}

export{ApiResponse}