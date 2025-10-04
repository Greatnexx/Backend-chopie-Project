import mongoose from "mongoose";

const userSchema = mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    lastLogin: { type: [Date], default: [new Date()] },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);
export default User
