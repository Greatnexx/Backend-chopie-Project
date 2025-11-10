import express from "express"

const router = express.Router();

// Customer authentication removed - QR code ordering doesn't require login
// Only restaurant staff need authentication via /restaurant/login

export default router