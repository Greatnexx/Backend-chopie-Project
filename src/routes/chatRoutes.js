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
  clearAllChats
} from '../Controllers/chat.js';
import { protect } from '../middlewares/restaurantAuth.js';

const router = express.Router();

// Customer routes
router.post('/create', createChat);
router.get('/:chatId/messages', getChatMessages);
router.post('/:chatId/messages', sendMessage);
router.put('/:chatId/messages/:messageId', editMessage);
router.delete('/:chatId/messages/:messageId', deleteMessage);
router.post('/:chatId/typing', setTypingStatus);

// Staff routes
router.get('/staff/chats', protect, getStaffChats);
router.post('/:chatId/accept', protect, acceptChat);
router.delete('/clear-all', clearAllChats);

export default router;