import mongoose from '../config/db.connect.js';



const bookingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'vehicle' },
    name:{type:String,default:null},
    mobile:{type:String,default:null},    
    pickupLocation:{ type:String,required: true },
    dropLocation:{ type: String,required: true },
    distance: {type:String,required: true }, // in km
    totalPrice: {type:String,required: true },
    bookingDate: {type:String,required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
    review: { type: mongoose.Schema.Types.ObjectId, ref: 'review', default: null },
    createdAt: { type: Date, default: Date.now }
},{timestamps:true,versionKey:false}
)

const Book = mongoose.model('booking',bookingSchema)

export default Book