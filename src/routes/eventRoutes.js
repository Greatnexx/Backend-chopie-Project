import express from 'express';
import { getActiveEvents, createEvent, getEventBanners, cleanupExpiredEvents, deleteEvent, getEventsByRestaurant } from '../Controllers/event.js';
import { uploadBanner } from '../middleware/uploadMiddleware.js';
import { protect, authorize } from '../middlewares/restaurantAuth.js';

const router = express.Router();

router.get('/events/banners', getEventBanners);
router.get('/events/active', protect, getActiveEvents);
router.get('/events/restaurant/:restaurantId', getEventsByRestaurant);
router.get('/events/restaurant/:restaurantId/active', getEventsByRestaurant);
router.post('/events', protect, authorize('SuperAdmin', 'MenuManager'), uploadBanner.single('bannerImage'), createEvent);
router.delete('/events/:id', protect, authorize('SuperAdmin', 'MenuManager'), deleteEvent);
router.post('/events/cleanup', cleanupExpiredEvents);

export default router;