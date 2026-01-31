import express from "express";
import { updateBranding, getBranding } from "../Controllers/brandingController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import { uploadMenu } from "../middlewares/menuUpload.js";

const router = express.Router();

router.get("/branding", authenticateToken, getBranding);
router.put("/branding", authenticateToken, uploadMenu.single('logo'), updateBranding);

export default router;