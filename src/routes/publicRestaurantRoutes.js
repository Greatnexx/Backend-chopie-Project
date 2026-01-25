import express from 'express';
import { getRestaurantPublicInfo } from '../Controllers/restaurantSettingsController.js';

const router = express.Router();

// Public restaurant info endpoint - no auth required
router.get('/:subdomain', getRestaurantPublicInfo);

export default router;