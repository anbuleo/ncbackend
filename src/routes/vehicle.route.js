import express from 'express';
import vehicleController from '../controller/vehicle.controller.js';



const router = express.Router()

router.post('/createvehicle',vehicleController.createVehicle)


export default router