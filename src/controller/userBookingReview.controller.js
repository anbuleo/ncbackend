import Booking from '../models/bookingModel.js'
import userModel from '../models/userModel.js';
import Vehicle from '../models/vehicleModel.js';
import { errorHandler } from '../utils/errorHandler.js';
import nodemailer from 'nodemailer';
import fetch from 'node-fetch'
import generateOTP from '../utils/generateOtp.js';
import Review from '../models/reviewModel.js';
// import admin from '../utils/firebaseAdmin.js';



const createReview = async (req,res,next)=>{
    try {
        const userId = req.user.id;
        const {bookingId, rating, comments} = req.body;

        const booking = await Booking.findById(bookingId);
        if( !booking || booking.user.toString() !== userId.toString()  ) next(errorHandler(403,'Unauthorized '))

        if(booking.status !== 'completed') next(errorHandler(400,'Can only review completed booking'))
        
            const review = await Review.create({
                user: userId,
                vehicle: booking.vehicle,
                rating,
                comments
              });

              booking.review = review._id;
              await booking.save()
              res.status(201).json({
                review,
                message:'Review created Success'
              })
    } catch (error) {
        next(error)
    }
}

const createBookings = async (req, res, next) => {
  try {
    const { pickupLocation, dropLocation, name, mobile,currentDate,time,amPm,km,fare } = req.body;

    if (!pickupLocation || !dropLocation || !name || !mobile || !km || !fare) {
      return next(errorHandler(400, 'Pickup and Drop locations must be [lng, lat] arrays'));
    }

    const userId = req.user.id;

    const vehicleList = await Vehicle.find();
    if (!vehicleList || vehicleList.length === 0) {
      return res.status(400).json({ message: 'No vehicle found in the system.' });
    }

    const vehicle = vehicleList[0]; // Safely extract the only vehicle

    // Distance calculation using OpenRouteService
    // const orsUrl = 'https://api.openrouteservice.org/v2/directions/driving-car/json';
    // const orsRes = await fetch(orsUrl, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': process.env.ORS_API_KEY,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     coordinates: [pickupLocation, dropLocation]
    //   })
    // });

    // const orsData = await orsRes.json();

    // if (!orsData?.routes?.[0]?.summary?.distance) {
    //   return next(errorHandler(500, 'Could not calculate route distance.'));
    // }

    // const distanceInKm = orsData.routes[0].summary.distance / 1000;
    // const totalPrice = distanceInKm * vehicle.pricePerKm;

    const booking = await Booking.create({
      user: userId,
      vehicle: vehicle._id,
      pickupLocation,
      dropLocation,
      distance: km,
      totalPrice:fare,
      name,
      mobile,
      bookingDate: currentDate.concat(' ',time,' ',amPm),
    });

    res.status(201).json({
      message: 'Booking created successfully'
    });

  } catch (error) {
    console.log(error);
    next(error);
  }
};

const confirmBookings = async(req,res,next)=>{
    try {
        const { bookingId } = req.body;
        const userId = req.user.id;

        let bookings = await Booking.findById({_id:bookingId})

        if(!bookings) return next(errorHandler(404,'Booking not found'))

        let {pickupLocation, dropLocation, name, mobile, distance, totalPrice,bookingDate} = bookings
    
        if (!pickupLocation || !dropLocation || !name || !mobile ) {
          return next(errorHandler(400, 'Pickup and Drop locations must be [lng, lat] arrays'));
        }
    
        const vehicle = await Vehicle.findOne(); // Add filtering if needed
        if (!vehicle) return next(errorHandler(404, 'No vehicle available'));
    
        // 🔁 Get distance from ORS
        // const orsUrl = 'https://api.openrouteservice.org/v2/directions/driving-car/json';
        // const orsRes = await fetch(orsUrl, {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': process.env.ORS_API_KEY,
        //     'Content-Type': 'application/json'
        //   },
        //   body: JSON.stringify({
        //     coordinates: [pickupLocation, dropLocation]
        //   })
        // });
    
        // const orsData = await orsRes.json();
        // const distanceInKm = orsData.routes[0].summary.distance / 1000;
        // const totalPrice = distanceInKm * vehicle.pricePerKm;
    
        // 🔁 Get addresses
        // const pickupAddress = await getAddressFromCoords(pickupLocation);
        // const dropAddress = await getAddressFromCoords(dropLocation);
    
        // ✅ Create booking
        bookings.status = 'confirmed'
    
        const user = await userModel.findById(userId);
    
        const message = `
    🚕 *Booking Confirmed*
    👤 Name: ${name}
    📞 Mobile: ${mobile}
    📍 Pickup: ${pickupLocation}
    📍 Drop: ${dropLocation}
    📏 Distance: ${distance} km
    💰 Price: ₹${totalPrice}
    🗓️  Trip Date: ${bookingDate}
    📄 Status: confirmed
        `;
    
        // 📧 Email
        // console.log(user)
        // await sendEmail(user.email, 'Cab Booking Confirmed', message.replace(/\n/g, '<br>'));
        await sendEmail(process.env.ADMIN_EMAIL, 'New Cab Booking', message.replace(/\n/g, '<br>'));
    
        // 💬 WhatsApp
        // await sendWhatsApp(mobile, message);
        // await sendWhatsApp(process.env.ADMIN_MOBILE, message);
        await bookings.save()
    
        res.status(201).json({
          message: 'Booking confirmed and notifications sent',
        });
    
      } catch (error) {
        console.log(error)
        next(error);
      }
}
const getlatestBooking =  async(req,res,next)=>{
    try {
        const userId = req.user.id;
        const latestBooking = await Booking.findOne({user:userId}).sort({createdAt:-1}).limit(1)
        if(!latestBooking) return next(errorHandler(204,'No booking found'))
        if(latestBooking.status !== 'pending') return next(errorHandler(404,'No booking found'))
        res.status(200).json({messge:'Success',latestBooking})
    } catch (error) {
        next(error)
    }
}

const getAddressFromCoords = async ([lng, lat]) => {
  const url = `https://api.openrouteservice.org/geocode/reverse?api_key=${process.env.ORS_API_KEY}&point.lat=${lat}&point.lon=${lng}&size=1`;

  // console.log("Fetching URL:", url);

  const response = await fetch(url);
  const data = await response.json();

  // console.log("Reverse Geocode Response:", JSON.stringify(data, null, 2));

  if (!data?.features?.[0]?.properties?.label) {
    throw new Error('Could not retrieve address');
  }

  return data.features[0].properties.label;
};


  const sendEmail = async (to, subject, html) => {

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }

    });
  
    await transporter.sendMail({
      from: `"ANANDAM-CABS" <${process.env.EMAIL_USER}>`,
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

  // const confirmationFCM = async (req, res) => {
  //   const { fcmToken, title, body } = req.body;
  
  //   if (!fcmToken || !title || !body) {
  //     return res.status(400).json({ message: "Missing required fields" });
  //   }
  
  //   const message = {
  //     notification: {
  //       title,
  //       body,
  //     },
  //     token: fcmToken,
  //   };
  
  //   try {
  //     const response = await admin.messaging().send(message);
  //     res.status(200).json({ message: "Notification sent", response });
  //   } catch (error) {
  //     console.error("FCM Error:", error);
  //     res.status(500).json({ message: "Failed to send notification", error });
  //   }
  // }
  
const getbookingforbookingscreeen = async(req,res,next)=>{
    try {
        const userId = req.user.id;
        const latestBooking =  await Booking.find({ 
            user: userId, 
            status: { $in: ['confirmed', 'completed'] }
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('review'); // Populates only if review exists

        if (!latestBooking || latestBooking.length === 0) {
            return next(errorHandler(404, 'No confirmed bookings found'));
        }
        
        // if(latestBooking.status !== 'pending') return next(errorHandler(404,'No booking found'))
        res.status(200).json({message:'Success',latestBooking})
    } catch (error) {
        next(error)
    }
}

const getTop6Reviews = async (req, res, next) => {
  try {
    const reviews = await Review.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: 'bookings', // collection name in MongoDB (should be plural and lowercase)
          localField: '_id',
          foreignField: 'review',
          as: 'bookingInfo'
        }
      },
      {
        $unwind: {
          path: '$bookingInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          rating: 1,
          comments: 1,
          createdAt: 1,
          vehicle: 1,
          user: 1,
          bookingName: '$bookingInfo.name'
        }
      }
    ]);

    if (!reviews || reviews.length === 0) {
      return next(errorHandler(204, 'No reviews found'));
    }

    res.status(200).json({
      message: 'Success',
      reviews
    });
  } catch (error) {
    next(error);
  }
};


const deleteBooking = async(req,res,next)=>{
  try{
    let {id} = req.params

    let del = await Booking.findByIdAndDelete({_id:id})

    if(!del) return next(errorHandler(404,"No booking found"))

    res.status(200).json({
      message:'Cancelled success'
    })

  }catch(error){
    next(error)
  }
}

const sendFeedbacktomail = async (req, res, next) => {
  try {
    const { email, mobile, name, feedback } = req.body;

    // HTML email content to be received by you (the company)
    const emailBody = `
      <h3>New Feedback Received</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Mobile:</strong> ${mobile}</p>
      <p><strong>Feedback:</strong></p>
      <p>${feedback}</p>
    `;

    // Send to your company's email (e.g., your support inbox)
    await sendEmail(process.env.ADMIN_EMAIL, "New Feedback from User", emailBody);

    res.status(200).json({
      message: 'Feedback sent successfully',
    });
  } catch (error) {
    next(error);
  }
};














export default {
    createReview,
    createBookings,
    confirmBookings,
    getlatestBooking,
    getbookingforbookingscreeen,
    getTop6Reviews,
    deleteBooking,
    sendFeedbacktomail
    
}
