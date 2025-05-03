import express from "express";
import authRoute from "./auth.route.js";
import vehicleRoute from './vehicle.route.js'


const router = express.Router();

router.use('/auth', authRoute)
router.use('/vehicle',vehicleRoute)

export default router