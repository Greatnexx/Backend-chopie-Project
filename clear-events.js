import mongoose from "mongoose";
import dotenv from "dotenv";
import Event from "./src/models/eventModel.js";

dotenv.config();

const clearEvents = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    
    // Clear all events
    const result = await Event.deleteMany({});
    
    console.log(`Cleared ${result.deletedCount} events from database`);
    console.log("All banner images removed!");
    
    process.exit(0);
  } catch (error) {
    console.error("Failed to clear events:", error);
    process.exit(1);
  }
};

clearEvents();