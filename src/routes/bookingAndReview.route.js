import express from "express";
import userBookingReviewController from "../controller/userBookingReview.controller.js";
import {verifyUser} from "../utils/verifyUser.js";


const router = express.Router();

router.post('/create',verifyUser,userBookingReviewController.createBookings)
router.post('/createreview',verifyUser,userBookingReviewController.createReview)
router.put('/confirm',verifyUser,userBookingReviewController.confirmBookings)
router.put('/sendfeedback',userBookingReviewController.sendFeedbacktomail)
router.get('/getpending',verifyUser,userBookingReviewController.getlatestBooking)
router.get('/getreview',verifyUser,userBookingReviewController.getbookingforbookingscreeen)
router.get('/getallreview',userBookingReviewController.getTop6Reviews)
router.delete('/cancelbooking/:id',verifyUser,userBookingReviewController.deleteBooking)
// router.post('/confirmfcm',userBookingReviewController.confirmationFCM)

// router.use('/review',reviewRoute)




export default router