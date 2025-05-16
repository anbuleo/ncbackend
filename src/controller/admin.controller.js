import { errorHandler } from "../utils/errorHandler.js";
import Book from "../models/bookingModel.js";
import nodemailer from 'nodemailer';
import User from '../models/userModel.js'


 const sendEmail = async (to, subject, html) => {

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }

    });
  
    await transporter.sendMail({
      from: `"Nainna Cabs" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
  };
  const sendWhatsApp = async (recipientPhoneNumber, messageText) => {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID; // From Meta
    const token = process.env.WHATSAPP_TOKEN; // Permanent or temporary token
  
    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
  
    const payload = {
      messaging_product: 'whatsapp',
      to: "+919715424895", // e.g., +919876543210
      type: 'text',
      text: {
        body: messageText,
      }
    };
  
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    
    const data = await response.json();
  
    console.log('WhatsApp API response:', data);
  
    if (!response.ok) {
      throw new Error(`Failed to send message: ${data.error?.message}`);
    }
  
    return data;
  };

const acceptBooking = async(req,res,next)=>{
    try {
        let {bookingId} = req.body
        let {role} = req.user
        let booking = await Book.findOne({_id:bookingId})
        if(!booking || role !=='admin' || booking.status !== 'completed') return next(errorHandler(404,'Not found'))
            let {email} = await User.findById({_id:booking?.user})
            
            const message = `
    🚕 *Booking Confirmed*
    👤 Name: ${booking?.name}
    📞 Mobile: ${booking?.mobile}
    📍 Pickup: ${booking?.pickupLocation}
    📍 Drop: ${booking?.dropLocation}
    📏 Distance: ${booking?.distance} km
    💰 Price: ₹${booking?.totalPrice}
    🗓️  Trip Date: ${booking?.bookingDate}
    📄 Status: confirmed
    note: Estimated fare is based on above metioned km only
        `;
        booking.status = "completed"
        await sendEmail(email, 'Cab Booking Confirmed', message.replace(/\n/g, '<br>'));

            await booking.save()
            res.status(200).json({
                message:'Booking accepted'
            })


        
    } catch (error) {
        next(error)
    }
}

const getAllBookings = async(req,res,next)=>{
    try{
        let {role} = req.user
        if(role !=="admin")return next(errorHandler(403,"unauthorized"))
            let bookings = await Book.find({atatus:{$ne:"pending"}}).sort({ createdAt: -1 });
        res.status(200).json({
            message:"booking data Success",
            bookings
        })
    }catch(error){
        next(error)
    }
}


const filterData = async(req,res,next)=>{
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based

    // Utility: convert totalPrice string to number (handle cases like "500", "500.00")
    const parsePrice = { $toDouble: "$totalPrice" };

    // 1. Last 5 years (yearly)
      const matchNonPending = {
      status: { $ne: "pending" }
    };

    // 1. Last 5 Years
    const fiveYearStart = new Date(currentYear - 4, 0, 1);
    const last5Years = await Book.aggregate([
      { $match: { ...matchNonPending, createdAt: { $gte: fiveYearStart } } },
      {
        $group: {
          _id: { $year: "$createdAt" },
          totalBookings: { $sum: 1 },
          totalEarning: { $sum: parsePrice }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 2. Monthly (Current Year)
    const yearStart = new Date(currentYear, 0, 1);
    const monthlyStats = await Book.aggregate([
      { $match: { ...matchNonPending, createdAt: { $gte: yearStart } } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalBookings: { $sum: 1 },
          totalEarning: { $sum: parsePrice }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. Weekly (Current Month)
    const monthStart = new Date(currentYear, currentMonth, 1);
    const weeklyStats = await Book.aggregate([
      { $match: { ...matchNonPending, createdAt: { $gte: monthStart } } },
      {
        $group: {
          _id: { $isoWeek: "$createdAt" },
          totalBookings: { $sum: 1 },
          totalEarning: { $sum: parsePrice }
        }
      },
      { $sort: { _id: 1 } }
    ]);
     res.status(200).json({
      last5Years: last5Years.map(y => ({ year: y._id, ...y })),
      monthlyStats: monthlyStats.map(m => ({ month: m._id, ...m })),
      weeklyStats: weeklyStats.map(w => ({ week: w._id, ...w })),
    });

  } catch (error) {
    next(error)
  }
}

export default {
    acceptBooking,
    getAllBookings,
    filterData
}