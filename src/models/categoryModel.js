import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    name: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    image: {
      type: String,
      required: false,
      
    },

  },
  {
    timestamps: true,
  }
);

// Create compound unique index for restaurantId and name
categorySchema.index({ restaurantId: 1, name: 1 }, { unique: true });

const Category= mongoose.model("Category", categorySchema);
export default Category
