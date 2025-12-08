import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
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