import mongoose from "mongoose";
import dotenv from "dotenv";
import RestaurantUser from "./src/models/restaurantUserModel.js";
import Restaurant from "./src/models/restaurantModel.js";

dotenv.config();

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    
    // First, create a default restaurant if it doesn't exist
    let defaultRestaurant = await Restaurant.findOne({ subdomain: 'default' });
    if (!defaultRestaurant) {
      defaultRestaurant = await Restaurant.create({
        name: 'Default Restaurant',
        email: 'default@restaurant.com',
        phone: '+1234567890',
        address: '123 Default Street',
        subdomain: 'default',
        isActive: true
      });
      console.log('Created default restaurant');
    }
    
    // Clear existing users
    await RestaurantUser.deleteMany({});
    
    // Create default users with restaurantId
    const users = [
      {
        restaurantId: defaultRestaurant._id,
        name: "Super Admin",
        email: "admin@restaurant.com",
        password: "admin123",
        role: "SuperAdmin"
      },
      {
        restaurantId: defaultRestaurant._id,
        name: "Transaction Manager",
        email: "manager@restaurant.com", 
        password: "manager123",
        role: "TransactionAdmin"
      },
      {
        restaurantId: defaultRestaurant._id,
        name: "Kitchen Staff",
        email: "kitchen@restaurant.com",
        password: "kitchen123", 
        role: "SubUser"
      },
      {
        restaurantId: defaultRestaurant._id,
        name: "Menu Manager",
        email: "menu@restaurant.com",
        password: "menu123",
        role: "MenuManager"
      },
      {
        restaurantId: defaultRestaurant._id,
        name: "Event Manager",
        email: "events@restaurant.com",
        password: "events123",
        role: "MenuManager"
      }
    ];
    
    // Create users one by one to trigger password hashing
    for (const userData of users) {
      const user = new RestaurantUser(userData);
      await user.save();
    }
    
    console.log("Restaurant users seeded successfully!");
    console.log("Default restaurant subdomain: default");
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