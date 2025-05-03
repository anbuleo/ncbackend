import mongoose from '../config/db.connect.js';


const vehicleSchema = new mongoose.Schema({
    type : {type:String,required:true},
    vehicleNumber : {type:String,required:true},
    brand : {type:String,required:true},
    vmodel : {type:String,required:true},
    pricePerKm : {type:Number,required:true},
    isAvailable: { type: Boolean, default: true }

},{timestamps:true,versionKey:false})


const Vehicle = mongoose.model('vehicle',vehicleSchema)


export default Vehicle