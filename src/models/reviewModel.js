import mongoose from "../config/db.connect.js";



const reviewSchema = new mongoose.Schema({
    user : { type: mongoose.Schema.Types.ObjectId, ref: 'user'},
    vehicle: {type:mongoose.Schema.Types.ObjectId,ref: 'vehicle'},
    rating: {type:Number,max:5},
    comments: {type:String,default :null},
    createdAt: { type: Date, default: Date.now }
},{timestamps:true,versionKey:false})


const Review = mongoose.model('review',reviewSchema)

export default Review