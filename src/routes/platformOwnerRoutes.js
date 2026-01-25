import express from 'express';
import { 
  loginPlatformOwner, 
  getPlatformAnalytics, 
  getAllRestaurantsDetailed,
  getRestaurantDetails,
  updateRestaurantStatus,
  getPerformanceMetrics,
  getSystemHealth,
  getActivityFeed,
  getRevenueAnalytics,
  getGrowthAnalytics,
  getAlerts
} from '../Controllers/platformOwnerController.js';
import { protectPlatformOwner } from '../middlewares/platformOwnerAuth.js';

const router = express.Router();

// Auth routes
router.post('/login', loginPlatformOwner);

// Protected routes (require platform owner authentication)
router.get('/analytics', protectPlatformOwner, getPlatformAnalytics);
router.get('/restaurants', protectPlatformOwner, getAllRestaurantsDetailed);
router.get('/restaurants/:restaurantId', protectPlatformOwner, getRestaurantDetails);
router.put('/restaurants/:restaurantId/status', protectPlatformOwner, updateRestaurantStatus);
router.get('/performance', protectPlatformOwner, getPerformanceMetrics);
router.get('/system-health', protectPlatformOwner, getSystemHealth);
router.get('/activity-feed', protectPlatformOwner, getActivityFeed);
router.get('/revenue-analytics', protectPlatformOwner, getRevenueAnalytics);
router.get('/growth-analytics', protectPlatformOwner, getGrowthAnalytics);
router.get('/alerts', protectPlatformOwner, getAlerts);

export default router;