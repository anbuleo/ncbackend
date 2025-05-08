import Vehicle from "../models/vehicleModel.js";
import { errorHandler } from "../utils/errorHandler.js";





const createVehicle = async(req,res,next)=>{
    try {
    const { type, vehicleNumber, brand, vmodel, pricePerKm } = req.body;
    const vehicle = await Vehicle.create({ type, vehicleNumber, brand, vmodel, pricePerKm });
    res.status(201).json({
        message:'vechicle created Success',
        vehicle
    });
    } catch (error) {
        next(error)
    }
}

const getVehicle = async(req,res,next)=>{
    try {
        const vehicle = await Vehicle.find()
        if(vehicle.length < 1) return next(errorHandler(400,'no vechicle found'))

            res.status(200).json({
                message:'vechile data',
                vehicle
            })

    } catch (error) {
        next(error)
    }
}

const updateVehicle = async (req, res) => {
    try {
      const updated = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.status(200).json({
        message:'vehicle updates succcess',
        updated
      });
    } catch {
      res.status(500).json({ message: 'Update failed' });
    }
  };

  const deleteVehicle = async (req, res) => {
    try {
      await Vehicle.findByIdAndDelete(req.params.id);
      res.json({ message: 'Vehicle deleted' });
    } catch {
      res.status(500).json({ message: 'Delete failed' });
    }
  };


export default {
    createVehicle,
    getVehicle,
    updateVehicle,
    deleteVehicle
}