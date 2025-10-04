import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    image: {
      type: String,
      required: false,
      default: "https://example.com/default-category-image.jpg", 
    },

  },
  {
    timestamps: true,
  }
);

const Category= mongoose.model("Category", categorySchema);
export default Category
