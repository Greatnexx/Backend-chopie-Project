import mongoose from "mongoose";
import dotenv from "dotenv";
import PlatformOwner from "./src/models/platformOwnerModel.js";

dotenv.config();

const createPlatformOwner = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    
    // Check if platform owner already exists
    const existingOwner = await PlatformOwner.findOne({ role: 'PlatformOwner' });
    if (existingOwner) {
      console.log('Platform owner already exists');
      console.log(`Email: ${existingOwner.email}`);
      process.exit(0);
    }
    
    // Create platform owner
    const platformOwner = await PlatformOwner.create({
      name: "Platform Admin",
      email: "admin@platform.com",
      password: "admin123",
      role: "PlatformOwner"
    });
    
    console.log("Platform owner created successfully!");
    console.log("Login credentials:");
    console.log(`Email: admin@platform.com`);
    console.log(`Password: admin123`);
    console.log(`Role: PlatformOwner`);
    
    process.exit(0);
  } catch (error) {
    console.error("Creation failed:", error);
    process.exit(1);
  }
};

createPlatformOwner();