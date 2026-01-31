import express from "express";
import { updateBranding, getBranding } from "../Controllers/brandingController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import { uploadLogo } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/branding", authenticateToken, getBranding);

// Add error handling middleware for file upload
router.put("/branding", authenticateToken, (req, res, next) => {
  uploadLogo.single('logo')(req, res, (err) => {
    if (err) {
      console.error('Upload middleware error:', err);
      return res.status(400).json({ message: 'File upload failed', error: err.message });
    }
    console.log('Upload middleware completed, file:', !!req.file);
    next();
  });
}, updateBranding);

export default router;