class ChatHub {
  constructor(io) {
    this.io = io;
    this.activeChats = new Map();
    this.userSockets = new Map();
  }

  handleConnection(socket) {
    console.log('ChatHub: User connected:', socket.id);

    socket.on('joinChat', (data) => {
      const { chatId, userType, userName } = data;
      socket.join(chatId);
      this.userSockets.set(socket.id, { chatId, userType, userName });
      
    });

    socket.on('sendMessage', (data) => {
      const { chatId, message } = data;
      // console.log('ChatHub: Broadcasting message to chat room:', chatId);
      // console.log('ChatHub: Message content:', message);
      
      // Broadcast to all OTHER users in the chat room (not sender)
      socket.to(chatId).emit('receiveMessage', {
        chatId,
        message,
        timestamp: new Date().toISOString()
      });
      
      // console.log(`ChatHub: Message broadcasted to room ${chatId}`);
    });

    socket.on('typing', (data) => {
      const { chatId, isTyping, userName } = data;
      socket.to(chatId).emit('userTyping', { chatId, isTyping, userName });
    });

    socket.on('disconnect', () => {
      const userData = this.userSockets.get(socket.id);
      if (userData) {
        console.log(`ChatHub: ${userData.userType} ${userData.userName} disconnected from chat: ${userData.chatId}`);
        this.userSockets.delete(socket.id);
      }
    });
  }

  notifyNewChat(chatData) {
    console.log('Notifying about new chat:', chatData);
    this.io.emit('newChatAvailable', chatData);
  }
}

export default ChatHub;