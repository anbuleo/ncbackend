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

const createBookings = async(req,res,next)=>{
    try {
        
            const { pickupLocation, dropLocation, name , mobile } = req.body;
            if (!pickupLocation || !dropLocation || !Array.isArray(pickupLocation) || !Array.isArray(dropLocation)) {
                return next(errorHandler(400, 'Pickup and Drop locations must be [lng, lat] arrays'));
              }
          
            const userId = req.user._id;
        
            const vehicle = await Vehicle.find()
            // if (!vehicle || !vehicle.isAvailable) return res.status(400).json({ message: '' });
        
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
            const distanceInKm = orsData.routes[0].summary.distance / 1000;
            const totalPrice = distanceInKm * vehicle[0]?.pricePerKm;
        
            const booking = await Booking.create({
              user: userId,
              vehicle: vehicle[0]._id,
              pickupLocation,
              dropLocation,
              distance: distanceInKm,
              totalPrice,
              name:name,
              mobile:mobile
            });
        
            res.status(201).json({
                message:'booking created Success',
                booking
            });
    } catch (error) {
        next(error)
    }
}

const confirmBookings = async(req,res,next)=>{
    try {
        const { bookingId } = req.body;
        const userId = req.user._id;

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
    📄 Status: pending
        `;
    
        // 📧 Email
        await sendEmail(user.email, 'Cab Booking Confirmed', message.replace(/\n/g, '<br>'));
        await sendEmail(process.env.ADMIN_EMAIL, 'New Cab Booking', message.replace(/\n/g, '<br>'));
    
        // 💬 WhatsApp
        // await sendWhatsApp(user.mobile, message);
        // await sendWhatsApp(process.env.ADMIN_MOBILE, message);
        await bookings.save()
    
        res.status(201).json({
          message: 'Booking confirmed and notifications sent',
          bookings
        });
    
      } catch (error) {
        next(error);
      }
}

const getAddressFromCoords = async ([lng, lat]) => {
    const res = await axios.get('https://api.openrouteservice.org/geocode/reverse', {
      params: {
        api_key: process.env.ORS_API_KEY,
        point: `${lat},${lng}`,
        size: 1
      }
    });
    return res.data.features[0].properties.label;
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
  















export default {
    createReview,
    createBookings
}