import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
    tableNumber: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },

    customerPhone: {
      type: String,
      default: null,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Menu",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        image: {
          type: String,
          default: null,
        },
        quantity: {
          type: Number,
          required: true,
        },
        specialInstructions: {
          type: String,
          default: null,
        },
        totalPrice: {
          type: Number,
          required: true,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "transfer"],
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "Preparing", "completed", "cancelled"],
      default: "pending",
    },
    orderStatus: {
      type: String,
      enum: ["pending", "accepted", "Preparing", "served", "cancelled"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },
    splitPayment: {
      cash: { type: Number, default: 0 },
      transfer: { type: Number, default: 0 },
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RestaurantUser",
      default: null,
    },
    orderSource: {
      type: String,
      enum: ["qr_code", "staff"],
      default: "qr_code",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RestaurantUser",
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
