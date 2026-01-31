import express from "express";
import { updateBranding, getBranding } from "../Controllers/brandingController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import { uploadLogo } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/branding", authenticateToken, getBranding);
router.put("/branding", authenticateToken, uploadLogo.single('logo'), updateBranding);

export default router;