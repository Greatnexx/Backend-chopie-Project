import express from "express";
import multer from "multer";
import path from "path";
import {
  getRestaurantSettings,
  updateBranding,
  updateSettings,
  updateRestaurantInfo,
  getDashboardStats,
} from "../Controllers/restaurantCustomization.js";
import { authenticateToken } from "../middlewares/restaurantAuth.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";

const router = express.Router();

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/logos/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Apply authentication and tenant middleware to all routes
router.use(authenticateToken);
router.use(tenantMiddleware);

// Restaurant settings routes
router.get("/settings", getRestaurantSettings);
router.get("/branding", getRestaurantSettings); // Use same function as it returns branding data
router.put("/branding", upload.single('logo'), updateBranding);
router.put("/settings", updateSettings);
router.put("/info", updateRestaurantInfo);
router.get("/dashboard-stats", getDashboardStats);

export default router;