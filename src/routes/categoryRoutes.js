import express from "express"
import { createCategory, getCategories, deleteCategory } from "../Controllers/category.js";
import { protect } from "../middlewares/authMiddleware.js";
import { protect as restaurantProtect } from "../middlewares/restaurantAuth.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";

const router = express.Router();

// Restaurant management routes (require authentication)
router.post("/category", restaurantProtect, tenantMiddleware, createCategory)
router.get("/categories", restaurantProtect, tenantMiddleware, getCategories);
router.delete("/category/:id", restaurantProtect, tenantMiddleware, deleteCategory);

// Debug endpoint to check auth status
router.get("/debug/auth", restaurantProtect, tenantMiddleware, (req, res) => {
  res.json({
    status: true,
    user: req.user,
    restaurantId: req.restaurantId,
    restaurant: req.restaurant
  });
});

export default router