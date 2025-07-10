import  mongoose,{Schema} from "mongoose";



const subscriptionSchema=new Schema({

    subsrcribe:{
        type:Schema.Types.ObjectId,    //ome who is subscribing
        ref:"User"
    },
    channel:{
        type:Schema.Types.ObjectId,  //channel is subscribing by user
        ref:"User"
    },
},{timestamps:true})



export const Subscription=mongoose.model("Subscription",subscriptionSchema)