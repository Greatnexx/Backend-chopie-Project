import mongoose from "mongoose";

const menuSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      min: 0,
    },
    menuTypes: {
      VIP: {
        price: { type: Number, min: 0 },
        available: { type: Boolean, default: true }
      },
      REGULAR: {
        price: { type: Number, min: 0 },
        available: { type: Boolean, default: true }
      }
    },
    image: {
      type: String,
      default: null,
    },
    available: {
      type: Boolean,
      default: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
  
  },
  {
    timestamps: true,
  }
);

const Menu= mongoose.model("Menu", menuSchema);
export default  Menu
