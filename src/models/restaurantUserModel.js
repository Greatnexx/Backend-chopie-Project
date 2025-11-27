import mongoose from "mongoose";
import bcrypt from "bcrypt";

const restaurantUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["SuperAdmin", "TransactionAdmin", "MenuManager", "SubUser"],
      default: "SubUser",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    assignedOrders: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    }],
    stars: {
      type: Number,
      default: 0,
    },
    isFirstLogin: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

restaurantUserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

restaurantUserSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const RestaurantUser = mongoose.model("RestaurantUser", restaurantUserSchema);
export default RestaurantUser;