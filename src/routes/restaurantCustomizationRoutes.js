import express from "express";
import {
  getRestaurantSettings,
  updateSettings,
  updateRestaurantInfo,
  getDashboardStats,
} from "../Controllers/restaurantCustomization.js";
import { authenticateToken } from "../middlewares/restaurantAuth.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";

const router = express.Router();

// Apply authentication and tenant middleware to all routes
router.use(authenticateToken);
router.use(tenantMiddleware);

// Restaurant settings routes
router.get("/settings", getRestaurantSettings);
router.put("/settings", updateSettings);
router.put("/info", updateRestaurantInfo);
router.get("/dashboard-stats", getDashboardStats);

export default router;