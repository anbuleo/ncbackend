import mongoose from "mongoose";
import env from "dotenv";

env.config();


let url = process.env.DB_URL;
let name = process.env.DB_NAME;

try {
    mongoose.connect(`${url}/${name}`)
    console.log("✅ Database connected"); 
} catch (error) {
    console.log(error);
}

export default mongoose