import express from "express";
import userBookingReviewController from "../controller/userBookingReview.controller.js";
import {verifyUser} from "../utils/verifyUser.js";


const router = express.Router();

router.post('/create',verifyUser,userBookingReviewController.createBookings)
router.put('/confirm',verifyUser,userBookingReviewController.confirmBookings)
router.get('/getpending',verifyUser,userBookingReviewController.getlatestBooking)
// router.post('/confirmfcm',userBookingReviewController.confirmationFCM)

// router.use('/review',reviewRoute)




export default router