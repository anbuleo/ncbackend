import Booking from '../models/bookingModel.js'
import userModel from '../models/userModel.js';
import Vehicle from '../models/vehicleModel.js';
import { errorHandler } from '../utils/errorHandler.js';
import nodemailer from 'nodemailer';
import fetch from 'node-fetch'



const createReview = async (req,res,next)=>{
    try {
        const userId = req.user.id;
        const {bookingId, rating, comment} = req.body;

        const booking = await Booking.findById(bookingId);
        if( !booking || booking.user.toString() !== userId.toString()  ) next(errorHandler(403,'Unauthorized '))

        if(booking.status === 'pending') next(errorHandler(400,'Can only review completed booking'))
        
            const review = await Review.create({
                user: userId,
                vehicle: booking.vehicle,
                rating,
                comment
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
    const { pickupLocation, dropLocation, name, mobile } = req.body;

    if (!pickupLocation || !dropLocation || !Array.isArray(pickupLocation) || !Array.isArray(dropLocation)) {
      return next(errorHandler(400, 'Pickup and Drop locations must be [lng, lat] arrays'));
    }

    const userId = req.user.id;

    const vehicleList = await Vehicle.find();
    if (!vehicleList || vehicleList.length === 0) {
      return res.status(400).json({ message: 'No vehicle found in the system.' });
    }

    const vehicle = vehicleList[0]; // Safely extract the only vehicle

    // Distance calculation using OpenRouteService
    const orsUrl = 'https://api.openrouteservice.org/v2/directions/driving-car/json';
    const orsRes = await fetch(orsUrl, {
      method: 'POST',
      headers: {
        'Authorization': process.env.ORS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        coordinates: [pickupLocation, dropLocation]
      })
    });

    const orsData = await orsRes.json();

    if (!orsData?.routes?.[0]?.summary?.distance) {
      return next(errorHandler(500, 'Could not calculate route distance.'));
    }

    const distanceInKm = orsData.routes[0].summary.distance / 1000;
    const totalPrice = distanceInKm * vehicle.pricePerKm;

    const booking = await Booking.create({
      user: userId,
      vehicle: vehicle._id,
      pickupLocation,
      dropLocation,
      distance: distanceInKm,
      totalPrice,
      name,
      mobile
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking
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

        let {pickupLocation, dropLocation, name, mobile} = bookings
    
        if (!pickupLocation || !dropLocation || !Array.isArray(pickupLocation) || !Array.isArray(dropLocation)) {
          return next(errorHandler(400, 'Pickup and Drop locations must be [lng, lat] arrays'));
        }
    
        const vehicle = await Vehicle.findOne(); // Add filtering if needed
        if (!vehicle) return next(errorHandler(404, 'No vehicle available'));
    
        // 🔁 Get distance from ORS
        const orsUrl = 'https://api.openrouteservice.org/v2/directions/driving-car/json';
        const orsRes = await fetch(orsUrl, {
          method: 'POST',
          headers: {
            'Authorization': process.env.ORS_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            coordinates: [pickupLocation, dropLocation]
          })
        });
    
        const orsData = await orsRes.json();
        const distanceInKm = orsData.routes[0].summary.distance / 1000;
        const totalPrice = distanceInKm * vehicle.pricePerKm;
    
        // 🔁 Get addresses
        const pickupAddress = await getAddressFromCoords(pickupLocation);
        const dropAddress = await getAddressFromCoords(dropLocation);
    
        // ✅ Create booking
        bookings.status = 'confirmed'
    
        const user = await userModel.findById(userId);
    
        const message = `
    🚕 *Booking Confirmed*
    👤 Name: ${name}
    📞 Mobile: ${mobile}
    📍 Pickup: ${pickupAddress}
    📍 Drop: ${dropAddress}
    📏 Distance: ${distanceInKm.toFixed(2)} km
    💰 Price: ₹${totalPrice.toFixed(2)}
    📄 Status: confirmed
        `;
    
        // 📧 Email
        console.log(user)
        await sendEmail(user.email, 'Cab Booking Confirmed', message.replace(/\n/g, '<br>'));
        await sendEmail(process.env.ADMIN_EMAIL, 'New Cab Booking', message.replace(/\n/g, '<br>'));
    
        // 💬 WhatsApp
        await sendWhatsApp(mobile, message);
        await sendWhatsApp(process.env.ADMIN_MOBILE, message);
        await bookings.save()
    
        res.status(201).json({
          message: 'Booking confirmed and notifications sent',
          bookings
        });
    
      } catch (error) {
        console.log(error)
        next(error);
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
  
  















export default {
    createReview,
    createBookings,
    confirmBookings
}