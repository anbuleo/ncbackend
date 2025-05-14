import express from "express";
import authController from "../controller/auth.controller.js";
import passport from 'passport'

const router = express.Router();

 

router.post('/signup',  authController.signUp);
router.get("/google",
    passport.authenticate("google", { scope: ["profile", "email", "https://www.googleapis.com/auth/user.phonenumbers.read"] })
);
router.get("/google/callback",passport.authenticate("google", {scope: ["profile", "email", "https://www.googleapis.com/auth/user.phonenumbers.read"], session: false, failureRedirect: "/auth/google/failure" }),authController.googlesignup)
router.get("/google/failure", (req, res) => {
    res.status(401).json({ success: false, message: "Google authentication failed" });
  });


  router.post("/send-otp", authController.sendOTP);
//   router.post("/verify-otp", authController.verifyOTP);
  router.post("/signin", authController.signIn);
      router.post("/forget", authController.forgotPasswordLink);
      router.post("/reset/:token", authController.resetPasswordWithToken);
      router.post("/firebase", authController.firebaseOauth);




export default router

