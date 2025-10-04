import mongoose from "mongoose";
import dotenv from "dotenv";
import RestaurantUser from "./src/models/restaurantUserModel.js";

dotenv.config();

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Clear existing users
    await RestaurantUser.deleteMany({});
    
    // Create default users
    const users = [
      {
        name: "Super Admin",
        email: "admin@restaurant.com",
        password: "admin123",
        role: "SuperAdmin"
      },
      {
        name: "Transaction Manager",
        email: "manager@restaurant.com", 
        password: "manager123",
        role: "TransactionAdmin"
      },
      {
        name: "Kitchen Staff",
        email: "kitchen@restaurant.com",
        password: "kitchen123", 
        role: "SubUser"
      },
      {
        name: "Menu Manager",
        email: "menu@restaurant.com",
        password: "menu123",
        role: "MenuManager"
      }
    ];
    
    await RestaurantUser.insertMany(users);
    console.log("Restaurant users seeded successfully!");
    console.log("Login credentials:");
    users.forEach(user => {
      console.log(`${user.role}: ${user.email} / ${user.password}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedUsers();