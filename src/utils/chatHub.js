class ChatHub {
  constructor(io) {
    this.io = io;
    this.activeChats = new Map();
    this.userSockets = new Map();
  }

  handleConnection(socket) {
  
    socket.on('joinChat', (data) => {
      const { chatId, userType, userName } = data;
      socket.join(chatId);
      this.userSockets.set(socket.id, { chatId, userType, userName });
    });

    socket.on('sendMessage', (data) => {
      const { chatId, message } = data;
      
      // Broadcast to ALL users in the chat room (including sender for confirmation)
      socket.to(chatId).emit('receiveMessage', {
        chatId,
        message,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('typing', (data) => {
      const { chatId, isTyping, userName } = data;
      socket.to(chatId).emit('userTyping', { chatId, isTyping, userName });
    });

    socket.on('disconnect', () => {
      const userData = this.userSockets.get(socket.id);
      if (userData) {
        this.userSockets.delete(socket.id);
      }
    });
  }

  notifyNewChat(chatData) {
    this.io.emit('newChatAvailable', chatData);
  }
}

export default ChatHub;