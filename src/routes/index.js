import express from "express";
import authRoute from "./auth.route.js";
import vehicleRoute from './vehicle.route.js'
import bookingAndReviewRoute from './bookingAndReview.route.js'
import adminRoute from './admin.route.js'


const router = express.Router();

router.use('/auth', authRoute)
router.use('/vehicle',vehicleRoute)
router.use('/bookingreview',bookingAndReviewRoute)
router.use('/admin',adminRoute)

export default router