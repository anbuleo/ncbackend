import { errorHandler } from "../utils/errorHandler.js";
import Book from "../models/bookingModel.js";




const acceptBooking = async(req,res,next)=>{
    try {
        let {bookingId} = req.body
        let {role} = req.user
        let booking = await Book.findOne({_id:bookingId})
        if(!booking || role !=='admin' || booking.status !== 'completed') return next(errorHandler(404,'Not found'))
            
            booking.status = "completed"

            await booking.save()
            res.status(200).json({
                message:'Booking accepted'
            })


        
    } catch (error) {
        next(error)
    }
}


export default {
    acceptBooking
}