import Chat from '../models/chatModel.js';
import RestaurantUser from '../models/restaurantUserModel.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

// Create or get existing chat
const createChat = async (req, res) => {
  try {
    const { customerName, customerEmail, orderNumber, restaurantId } = req.body;
    
    const targetRestaurantId = restaurantId || req.restaurantId;
    
    if (!targetRestaurantId) {
      return errorResponse(res, 400, 'Restaurant context required');
    }
    
    const query = { 
      customerName, 
      orderNumber,
      status: 'active',
      restaurantId: targetRestaurantId
    };
    
    let existingChat = await Chat.findOne(query);
    
    if (existingChat) {
      return successResponse(res, 200, 'Chat already exists', existingChat);
    }
    
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const chatData = {
      chatId,
      customerName,
      customerEmail,
      orderNumber,
      restaurantId: targetRestaurantId,
      status: 'pending' // Set initial status as pending
    };
    
    const chat = new Chat(chatData);
    await chat.save();
    
    // Only notify staff for new chats that need acceptance
    req.io.emit('newChatAvailable', {
      chatId: chat.chatId,
      customerName: chat.customerName,
      orderNumber: chat.orderNumber
    });
    
    successResponse(res, 201, 'Chat created successfully', chat);
  } catch (error) {
    errorResponse(res, 500, 'Failed to create chat', error.message);
  }
};

// Send message
const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { sender, senderType, content, messageType = 'text' } = req.body;
    
    const chat = await Chat.findOne({ chatId });
    if (!chat) {
      return errorResponse(res, 404, 'Chat not found');
    }
    
    const message = {
      sender,
      senderType,
      content,
      messageType
    };
    
    chat.messages.push(message);
    chat.lastActivity = new Date();
    await chat.save();
    
    const savedMessage = chat.messages[chat.messages.length - 1];
    
    // Emit to chat room via ChatHub
    req.io.to(chatId).emit('receiveMessage', {
      chatId,
      message: savedMessage,
      timestamp: new Date().toISOString()
    });
    
    successResponse(res, 200, 'Message sent', savedMessage);
  } catch (error) {
    errorResponse(res, 500, 'Failed to send message', error.message);
  }
};

// Edit message
const editMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const { content } = req.body;
    
    const chat = await Chat.findOne({ chatId });
    if (!chat) {
      return errorResponse(res, 404, 'Chat not found');
    }
    
    const message = chat.messages.id(messageId);
    if (!message) {
      return errorResponse(res, 404, 'Message not found');
    }
    
    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    
    await chat.save();
    
    req.io.to(chatId).emit('messageEdited', {
      chatId,
      messageId,
      content,
      editedAt: message.editedAt
    });
    
    successResponse(res, 200, 'Message edited', message);
  } catch (error) {
    errorResponse(res, 500, 'Failed to edit message', error.message);
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    
    const chat = await Chat.findOne({ chatId });
    if (!chat) {
      return errorResponse(res, 404, 'Chat not found');
    }
    
    const message = chat.messages.id(messageId);
    if (!message) {
      return errorResponse(res, 404, 'Message not found');
    }
    
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'This message was deleted';
    
    await chat.save();
    
    req.io.to(chatId).emit('messageDeleted', {
      chatId,
      messageId,
      deletedAt: message.deletedAt
    });
    
    successResponse(res, 200, 'Message deleted', message);
  } catch (error) {
    errorResponse(res, 500, 'Failed to delete message', error.message);
  }
};

// Get chat messages
const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const chat = await Chat.findOne({ chatId }).populate('assignedStaff', 'name email');
    if (!chat) {
      return errorResponse(res, 404, 'Chat not found');
    }
    
    successResponse(res, 200, 'Chat messages retrieved', chat);
  } catch (error) {
    errorResponse(res, 500, 'Failed to get messages', error.message);
  }
};

// Get staff chats
const getStaffChats = async (req, res) => {
  try {
    let query = { status: { $in: ['pending', 'active'] } };
    
    // Use the restaurant's subdomain to match chats
    if (req.restaurant && req.restaurant.subdomain) {
      query.restaurantId = req.restaurant.subdomain;
    }
    
    const chats = await Chat.find(query)
      .populate('assignedStaff', 'name email')
      .sort({ lastActivity: -1 });
    
    successResponse(res, 200, 'Staff chats retrieved', chats);
  } catch (error) {
    errorResponse(res, 500, 'Failed to get chats', error.message);
  }
};

// Set typing status
const setTypingStatus = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { isTyping, sender } = req.body;
    
    req.io.to(chatId).emit('typingStatus', {
      chatId,
      sender,
      isTyping
    });
    
    successResponse(res, 200, 'Typing status updated');
  } catch (error) {
    errorResponse(res, 500, 'Failed to update typing status', error.message);
  }
};

// Accept chat
const acceptChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { staffId } = req.body;
    
    const chat = await Chat.findOne({ chatId });
    
    if (!chat) {
      return errorResponse(res, 404, 'Chat not found');
    }
    
    // Only accept if not already accepted
    if (chat.status === 'active' && chat.assignedStaff) {
      return successResponse(res, 200, 'Chat already accepted', chat);
    }
    
    chat.assignedStaff = staffId;
    chat.status = 'active';
    await chat.save();
    
    req.io.to(chatId).emit('chatAccepted', {
      chatId,
      staffName: req.user?.name || 'Staff Member'
    });
    
    successResponse(res, 200, 'Chat accepted successfully', chat);
  } catch (error) {
    errorResponse(res, 500, 'Failed to accept chat', error.message);
  }
};

// Clear all chats
const clearAllChats = async (req, res) => {
  try {
    await Chat.deleteMany({});
    successResponse(res, 200, 'All chats cleared successfully');
  } catch (error) {
    errorResponse(res, 500, 'Failed to clear chats', error.message);
  }
};

// Test endpoint to manually trigger chat notification
const testChatNotification = async (req, res) => {
  try {
    const testChatData = {
      chatId: 'test_chat_123',
      customerName: 'Test Customer',
      orderNumber: 'TEST001'
    };
    
    console.log('🧪 TEST: Emitting newChatAvailable event:', testChatData);
    req.io.emit('newChatAvailable', testChatData);
    
    successResponse(res, 200, 'Test notification sent', testChatData);
  } catch (error) {
    errorResponse(res, 500, 'Failed to send test notification', error.message);
  }
};

export {
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
};