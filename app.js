import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./database/db.js";

import { errorHandler, notFound } from "./src/middlewares/errorMiddleware.js";
import userRoutes from "./src/routes/userRoute.js";
import categoryRoutes from "./src/routes/categoryRoutes.js";
import menuRoutes from "./src/routes/menuRoutes.js"
import orderRoutes from "./src/routes/orderRoute.js";
import restaurantRoutes from "./src/routes/restaurantRoutes.js";
import chatRoutes from "./src/routes/chatRoutes.js";
import ChatHub from "./src/utils/chatHub.js";
// import { testEmailConfiguration } from "./src/utils/emailService.js";
dotenv.config({ quiet: true });
connectDB();


// Define allowed origins for both Express and Socket.IO
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.PROD_FRONTEND_URL
  
  
].filter(Boolean); // Remove undefined values

const app = express();
const server = createServer(app);
export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const chatHub = new ChatHub(io);
export { chatHub };

const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug: Log all registered routes
console.log('Registering routes...');
app.use("/api/v1", userRoutes); 
app.use("/api/v1", categoryRoutes); 
app.use("/api/v1", menuRoutes); 
app.use("/api/v1", orderRoutes);
app.use("/api/v1/restaurant", restaurantRoutes);
console.log('Restaurant routes registered at /api/v1/restaurant');


app.use("/api/v1/chat", (req, res, next) => {
  req.io = io;
  req.chatHub = chatHub;
  next();
}, chatRoutes);
giconsole.log('Chat routes registered at /api/v1/chat');

app.get("/test", (req, res) => {
  res.send("Server is working Bro");
});

// Test endpoints to verify routes are working
app.get("/api/v1/test-chat", (req, res) => {
  res.json({ message: "Chat routes are registered", timestamp: new Date() });
});

app.get("/api/v1/test-restaurant", (req, res) => {
  res.json({ message: "Restaurant routes are registered", timestamp: new Date() });
});


app.get("/api/v1/restaurant/dashboard", async (req, res) => {
  try {
    res.json({
      status: true,
      data: {
        user: {
          name: 'Guest User',
          email: 'guest@restaurant.com',
          role: 'SubUser',
          isActive: true,
          stars: 0
        },
        analytics: {
          totalRevenue: 0,
          totalOrders: 0,
          completedOrders: 0,
          delayedOrders: 0,
          fastOrders: 0,
          avgOrderTime: 0,
          period: 'day'
        },
        orders: [],
        users: []
      }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

app.get("/api/v1/restaurant/profile", async (req, res) => {
  try {
    res.json({
      status: true,
      data: {
        _id: '000000000000000000000000',
        name: 'Default User',
        email: 'default@restaurant.com',
        role: 'SubUser',
        isActive: true,
        stars: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message || 'Server error' });
  }
});


io.on('connection', (socket) => {
  // console.log('🔌 New Socket.IO connection:', socket.id);
  // console.log('🌐 Client origin:', socket.handshake.headers.origin);
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log('❌ Socket.IO disconnection:', socket.id, 'Reason:', reason);
  });
  
  // Handle connection errors
  socket.on('connect_error', (error) => {
    console.error('🚨 Socket.IO connection error:', error);
  });
  
  chatHub.handleConnection(socket);
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
