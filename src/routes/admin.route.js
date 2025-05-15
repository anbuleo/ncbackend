import express from 'express'
import adminController from "../controller/admin.controller.js"

const router = express.Router()

router.put('/confirmbooking',adminController.acceptBooking)





export default router