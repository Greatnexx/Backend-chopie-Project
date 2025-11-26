import mongoose from "mongoose";
import dotenv from "dotenv";
import RestaurantUser from "./src/models/restaurantUserModel.js";

dotenv.config();

const resetMenuManagerPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    
    // Find and update Menu Manager
    const menuManager = await RestaurantUser.findOne({ email: "menu@restaurant.com" });
    
    if (menuManager) {
      menuManager.password = "menu123";
      await menuManager.save();
      console.log("✅ Menu Manager password reset to: menu123");
    } else {
      console.log("❌ Menu Manager not found");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Reset failed:", error);
    process.exit(1);
  }
};

resetMenuManagerPassword();