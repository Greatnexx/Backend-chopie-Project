import express from "express";
import { updateBranding, getBranding } from "../controllers/brandingController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authenticateToken, getBranding);
router.put("/", authenticateToken, updateBranding);

export default router;