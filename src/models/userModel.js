import mongoose from "../config/db.connect.js";

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, default: null },
    name: { type: String, required: true },
    // lastName: { type: String, default: null },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    address: { type: String, default: null },
    mobile: { type: String,  unique: true ,default :null},
    role: { type: String, default: "user" },
    isVerified: { type: Boolean, default: false },

    
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false }
);

export default mongoose.model("user", userSchema);
