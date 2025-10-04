import express from "express"
import { createCategory, getCategories } from "../Controllers/category.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/category", createCategory)
router.get("/categories",  getCategories);



export default router