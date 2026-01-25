import express from 'express';
import { 
  createChat, 
  sendMessage, 
  editMessage, 
  deleteMessage, 
  getChatMessages, 
  getStaffChats, 
  setTypingStatus,
  acceptChat,
  clearAllChats,
  testChatNotification
} from '../Controllers/chat.js';
import { protect } from '../middlewares/restaurantAuth.js';
import { requireTenant } from '../middlewares/tenantMiddleware.js';

const router = express.Router();

// Customer routes - no tenant middleware needed for basic chat
router.post('/create', (req, res, next) => {
  // Set restaurantId from request body for customer chat creation
  if (req.body.restaurantId) {
    req.restaurantId = req.body.restaurantId;
  }
  next();
}, createChat);
router.get('/test-notification', testChatNotification);
router.get('/test-accept', (req, res) => {
  res.json({ message: 'Accept route is accessible', timestamp: new Date() });
});

// Staff routes - put specific routes before parameterized ones
router.get('/staff/chats', protect, requireTenant, getStaffChats);
router.post('/:chatId/accept', protect, acceptChat);
router.delete('/clear-all', clearAllChats);

// Chat message routes - put after accept route to avoid conflicts
router.get('/:chatId/messages', getChatMessages);
router.post('/:chatId/messages', sendMessage);
router.put('/:chatId/messages/:messageId', editMessage);
router.delete('/:chatId/messages/:messageId', deleteMessage);
router.post('/:chatId/typing', setTypingStatus);

export default router;