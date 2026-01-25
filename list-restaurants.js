import mongoose from "mongoose";
import dotenv from "dotenv";
import Restaurant from "./src/models/restaurantModel.js";

dotenv.config();

const listRestaurants = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const restaurants = await Restaurant.find({}).select('name subdomain email isActive');
    
    console.log("All Restaurants:");
    console.log("================");
    
    restaurants.forEach(restaurant => {
      console.log(`Name: ${restaurant.name}`);
      console.log(`Subdomain: ${restaurant.subdomain}`);
      console.log(`Email: ${restaurant.email}`);
      console.log(`Active: ${restaurant.isActive}`);
      console.log(`Ordering URL: http://localhost:3000/r/${restaurant.subdomain}`);
      console.log("---");
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

listRestaurants();