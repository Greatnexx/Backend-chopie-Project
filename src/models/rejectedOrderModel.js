import mongoose from "mongoose";

const rejectedOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RestaurantUser",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
  },
  { timestamps: true }
);

const RejectedOrder = mongoose.model("RejectedOrder", rejectedOrderSchema);
export default RejectedOrder;