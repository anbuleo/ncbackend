import User from '../models/userModel.js';  
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { errorHandler } from '../utils/errorHandler.js';
import passport from 'passport';
import crypto from "crypto";
import nodemailer from "nodemailer";

const otpStore = {};

const signUp = async (req, res,next) => {    
    try {
        const { firstName, lastName, email, password, mobile, address } = req.body;

        if (!firstName  || !email || !password || !mobile ) {
            return next(errorHandler(400, 'All fields are required'));
        }

        const existingEmail = await User.findOne({ email });
        const existingMobile = await User.findOne({ mobile });

        if (existingEmail || existingMobile) {
            return next(errorHandler(400, 'User already exists'));
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            mobile,
            address,
        });

        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        next(error);
    }
};

const googlesignup = async(req,res,next)=>{
   
    try {
        const { user, token } = req.user;
        if (!user || !token) {
            return next(errorHandler(401,'Authentication failed'))
          }
        res.json({
          success: true,
          token,
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            role: user.role,
            mobile: user.mobile,
          },
        });
      } catch (error) {
        res.status(500).json({ success: false, message: "OAuth failed", error });
      }
    
    }

    const sendOtpEmail = async (userEmail, otp) => {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });
      
        const otpMessage = `Your OTP is: ${otp}. It is valid for 5 minutes.`;
      
        await transporter.sendMail({
          to: userEmail,
          subject: "Your OTP for Email Verification",
          text: otpMessage,
        });
      };
      const sendOTP = async (req, res, next) => {
        try {
          const { email } = req.body;
      
          if (!email) {
            return next(errorHandler(400, "Email is required"));
          }
      
          const otp = generateOTP();
          const expiresAt = Date.now() + 5 * 60 * 1000;
      
          otpStore[email] = { otp, expiresAt };
      
          // Send OTP to user's email
          await sendOtpEmail(email, otp);
      
          res.status(200).json({
            message: "OTP sent to your email. Please verify it to complete signup.",
          });
        } catch (error) {
          next(error);
        }
      };
      const verifyOTP = async (req, res, next) => {
        try {
          const { email, otp } = req.body;
      
          if (!email || !otp) {
            return next(errorHandler(400, "Email and OTP are required"));
          }
      
          const storedOtpData = otpStore[email];
          if (!storedOtpData) {
            return next(errorHandler(400, "OTP not sent or expired"));
          }
      
          // Check if OTP is expired
          if (storedOtpData.expiresAt < Date.now()) {
            delete otpStore[email]; // Clear expired OTP
            return next(errorHandler(400, "OTP expired"));
          }
      
          // Check if OTP is valid
          if (storedOtpData.otp !== otp) {
            return next(errorHandler(400, "Invalid OTP"));
          }
      
          delete otpStore[email];
      
          res.status(200).json({
            message: "OTP verified successfully. You can now complete your signup.",
          });
        } catch (error) {
          next(error);
        }
      };
      
      const signIn = async (req, res, next) => {
        try {
          const { email, password } = req.body;
      
          // Validate input
          if (!email || !password) {
            return next(errorHandler(400, "Email and password are required"));
          }
      
          // Check if user exists
          const user = await User.findOne({ email });
          if (!user) {
            return next(errorHandler(404, "User not found"));
          }
      
          // Compare password
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return next(errorHandler(400, "Invalid credentials"));
          }
      
          // Generate JWT token
          const token = jwt.sign({ id: user._id,role:user.role }, process.env.JWT_SECRET, {
            expiresIn: "1d",
          });
      
          // Send response
          res.status(200).json({            
            message: "Login successful",
            token,
            user: {
              id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              mobile: user.mobile,
              address: user.address,
            },
          });
        } catch (error) {
          next(error);
        }
      };
      const forgotPasswordLink = async (req, res, next) => {
        try {
          const { email } = req.body;
          if (!email) return next(errorHandler(400, "Email is required"));
      
          const user = await User.findOne({ email });
          if (!user) return next(errorHandler(404, "User not found"));
      
          const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "15m",
          });
      
          const resetLink = `http://localhost:3000/reset-password/${token}`; // Change URL to your frontend
      
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
            secure: false, // set to false for STARTTLS
            tls: {
              rejectUnauthorized: false, // allow self-signed
            },
          });
      
          await transporter.sendMail({
            to: email,
            subject: "Password Reset Link",
            html: `<p>Click the link below to reset your password. This link expires in 15 minutes.</p>
                   <a href="${resetLink}">${resetLink}</a>`,
          });
      
          res.status(200).json({ message: "Reset link sent to your email." });
        } catch (error) {
          next(error);
        }
      };
      
      const resetPasswordWithToken = async (req, res, next) => {
        try {
          const { newPassword } = req.body;
          const { token } = req.params; // ✅ extract token from URL
      
          if (!token || !newPassword) {
            return next(errorHandler(400, "Token and new password are required"));
          }
      
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.id);
          if (!user) return next(errorHandler(404, "User not found"));
      
          const hashedPassword = await bcrypt.hash(newPassword, 10);
          user.password = hashedPassword;
          await user.save();
      
          res.status(200).json({ message: "Password has been reset successfully." });
        } catch (error) {
          return next(errorHandler(400, "Invalid or expired token"));
        }
      };
      
      
export default {
    signUp,
    googlesignup,
    sendOTP,
    verifyOTP,
    forgotPasswordLink,
    resetPasswordWithToken,
    signIn
}