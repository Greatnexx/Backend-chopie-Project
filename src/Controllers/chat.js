import Chat from '../models/chatModel.js';
import RestaurantUser from '../models/restaurantUserModel.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

// Create or get existing chat
const createChat = async (req, res) => {
  try {
    const { customerName, customerEmail, orderNumber } = req.body;
    
    // Check if chat already exists for this order
    let existingChat = await Chat.findOne({ 
      customerName, 
      orderNumber,
      status: 'active'
    });
    
    if (existingChat) {
      return successResponse(res, 200, 'Chat already exists', existingChat);
    }
    
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const chat = new Chat({
      chatId,
      customerName,
      customerEmail,
      orderNumber
    });
    
    await chat.save();
    console.log('New chat created:', chatId, 'for customer:', customerName);
    
    // Auto-assign to first available MenuManager
    const availableStaff = await RestaurantUser.findOne({ 
      role: 'MenuManager',
      isActive: true 
    });
    
    if (availableStaff) {
      chat.assignedStaff = availableStaff._id;
      await chat.save();
      console.log('Chat assigned to MenuManager:', availableStaff.name);
    }
    
    // Notify via chat hub immediately
    if (req.chatHub) {
      console.log('Notifying MenuManagers about new chat:', chat.chatId);
      req.chatHub.notifyNewChat({
        chatId: chat.chatId,
        customerName: chat.customerName,
        orderNumber: chat.orderNumber
      });
    }
    
    // Also emit via socket for immediate updates
    req.io.emit('newChatAvailable', {
      chatId: chat.chatId,
      customerName: chat.customerName,
      orderNumber: chat.orderNumber
    });
    
    successResponse(res, 201, 'Chat created successfully', chat);
  } catch (error) {
    console.error('Create chat error:', error);
    errorResponse(res, 500, 'Failed to create chat', error.message);
  }
};

// Send message
const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { sender, senderType, content, messageType = 'text' } = req.body;
    
    console.log('API: Saving message to DB:', { chatId, sender, senderType, content });
    
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
    console.log('API: Message saved successfully:', savedMessage._id);
    
    successResponse(res, 200, 'Message sent', savedMessage);
  } catch (error) {
    console.error('API: Send message error:', error);
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
    console.log('Getting chats for user:', req.user.email, 'role:', req.user.role);
    
    let query = { status: 'active' };
    
    // MenuManagers can see all unassigned chats or chats assigned to them
    if (req.user.role === 'MenuManager') {
      query.$or = [
        { assignedStaff: req.user._id },
        { assignedStaff: null }
      ];
    }
    
    const chats = await Chat.find(query)
      .populate('assignedStaff', 'name email')
      .sort({ lastActivity: -1 });
    
    console.log('Found chats:', chats.length);
    successResponse(res, 200, 'Staff chats retrieved', chats);
  } catch (error) {
    console.error('Get staff chats error:', error);
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
    
    console.log('Accepting chat:', chatId, 'by staff:', staffId);
    
    const chat = await Chat.findOne({ chatId });
    if (!chat) {
      return errorResponse(res, 404, 'Chat not found');
    }
    
    // Assign staff to chat
    chat.assignedStaff = staffId;
    await chat.save();
    
    console.log('Chat accepted and assigned to staff:', staffId);
    
    // Notify customer that chat was accepted
    req.io.to(chatId).emit('chatAccepted', {
      chatId,
      staffName: req.user.name
    });
    
    successResponse(res, 200, 'Chat accepted successfully', chat);
  } catch (error) {
    console.error('Accept chat error:', error);
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

export {
  createChat,
  sendMessage,
  editMessage,
  deleteMessage,
  getChatMessages,
  getStaffChats,
  setTypingStatus,
  acceptChat,
  clearAllChats
};