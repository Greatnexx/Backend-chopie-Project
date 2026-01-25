import express from "express";
import { registerRestaurant, getRestaurantBySubdomain } from "../Controllers/publicAuth.js";

const router = express.Router();

// Public restaurant registration
router.post("/register", registerRestaurant);

// Get restaurant by subdomain (for frontend to load branding)
router.get("/restaurant/:subdomain", getRestaurantBySubdomain);

export default router;