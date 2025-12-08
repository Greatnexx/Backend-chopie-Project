import express from 'express';
import { getActiveEvents, createEvent, getEventBanners, cleanupExpiredEvents, deleteEvent } from '../Controllers/event.js';
import { uploadBanner } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/events/banners', getEventBanners);
router.get('/events/active', getActiveEvents);
router.post('/events', uploadBanner.single('bannerImage'), createEvent);
router.delete('/events/:id', deleteEvent);
router.post('/events/cleanup', cleanupExpiredEvents);

export default router;