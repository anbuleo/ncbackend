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
        if(!booking || role !=='admin' || booking.status == 'completed') return next(errorHandler(404,'Not found'))
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


const filterData = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const matchCompleted = { status: "completed" };
    const parsePrice = { $toDouble: "$totalPrice" };

    // 1. Last 5 Years
    const fiveYearStart = new Date(currentYear - 4, 0, 1);
    const last5YearsRaw = await Book.aggregate([
      { $match: { ...matchCompleted, createdAt: { $gte: fiveYearStart } } },
      {
        $group: {
          _id: { $year: "$createdAt" },
          bookings: { $sum: 1 },
          earnings: { $sum: parsePrice }
        }
      }
    ]);

    const last5Years = [];
    for (let i = currentYear - 4; i <= currentYear; i++) {
      const found = last5YearsRaw.find(y => y._id === i);
      last5Years.push({
        period: `${i}`,
        bookings: found?.bookings || 0,
        earnings: found?.earnings || 0
      });
    }

    // 2. Monthly Stats
    const yearStart = new Date(currentYear, 0, 1);
    const monthlyStatsRaw = await Book.aggregate([
      { $match: { ...matchCompleted, createdAt: { $gte: yearStart } } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          bookings: { $sum: 1 },
          earnings: { $sum: parsePrice }
        }
      }
    ]);

    const monthlyStats = monthNames.map((name, index) => {
      const found = monthlyStatsRaw.find(m => m._id === index + 1); // 1-based
      return {
        period: name,
        bookings: found?.bookings || 0,
        earnings: found?.earnings || 0
      };
    });

    // 3. Weekly Stats for Current Month
    const monthStart = new Date(currentYear, currentMonth, 1);
    const nextMonthStart = new Date(currentYear, currentMonth + 1, 1);

    const weeklyRaw = await Book.aggregate([
      {
        $match: {
          ...matchCompleted,
          createdAt: { $gte: monthStart, $lt: nextMonthStart }
        }
      },
      {
        $project: {
          totalPrice: parsePrice,
          week: {
            $ceil: { $divide: [{ $dayOfMonth: "$createdAt" }, 7] }
          }
        }
      },
      {
        $group: {
          _id: "$week",
          bookings: { $sum: 1 },
          earnings: { $sum: "$totalPrice" }
        }
      }
    ]);

    const weeklyStats = [1, 2, 3, 4].map(week => {
      const found = weeklyRaw.find(w => w._id === week);
      return {
        period: `Week ${week}`,
        bookings: found?.bookings || 0,
        earnings: found?.earnings || 0
      };
    });

    res.status(200).json({
      last5Years,
      monthlyStats,
      weeklyStats
    });

  } catch (error) {
    next(error);
  }
};




export default {
    acceptBooking,
    getAllBookings,
    filterData
}