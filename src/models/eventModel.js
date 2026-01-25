import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    title: {
      type: String,
      
    },
    description: {
      type: String,
      
    },
    bannerImage: {
      type: String,
      default: null,
      required: true,
    },
    startDate: {
      type: Date,
      
    
    },
    endDate: {
      type: Date,
    
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Event = mongoose.model("Event", eventSchema);

export default Event;