import mongoose from "mongoose";
import dotenv from "dotenv";
import RestaurantUser from "./src/models/restaurantUserModel.js";

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Delete existing SuperAdmin to recreate with proper password hashing
    await RestaurantUser.deleteOne({ role: "SuperAdmin" });
    
    const superAdmin = new RestaurantUser({
      name: "Super Admin",
      email: "superadmin@chopie.com",
      password: "SuperAdmin123!",
      role: "SuperAdmin",
      isActive: true
    });
    
    await superAdmin.save();
    console.log("SuperAdmin created successfully!");
    console.log("Login: superadmin@chopie.com / SuperAdmin123!");
    
    process.exit(0);
  } catch (error) {
    console.error("SuperAdmin seeding failed:", error);
    process.exit(1);
  }
};

seedSuperAdmin();