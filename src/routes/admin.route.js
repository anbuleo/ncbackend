import express from 'express'
import adminController from "../controller/admin.controller.js"
import {verifyUser} from '../utils/verifyUser.js'

const router = express.Router()

router.put('/confirmbooking',verifyUser,adminController.acceptBooking)
router.get('/getallbooking',verifyUser,adminController.getAllBookings)
router.get('/filter',verifyUser,adminController.filterData)





export default router