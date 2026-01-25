import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./database/db.js";
import { tenantMiddleware } from "./src/middlewares/tenantMiddleware.js";

// Increase EventEmitter max listeners to prevent memory leak warnings
process.setMaxListeners(20);

import { errorHandler, notFound } from "./src/middlewares/errorMiddleware.js";
import userRoutes from "./src/routes/userRoute.js";
import categoryRoutes from "./src/routes/categoryRoutes.js";
import menuRoutes from "./src/routes/menuRoutes.js";
import orderRoutes from "./src/routes/orderRoute.js";
import restaurantRoutes from "./src/routes/restaurantRoutes.js";
import restaurantCustomizationRoutes from "./src/routes/restaurantCustomizationRoutes.js";
import restaurantSettingsRoutes from "./src/routes/restaurantSettingsRoutes.js";
import tenantRoutes from "./src/routes/tenantRoutes.js";
import platformOwnerRoutes from "./src/routes/platformOwnerRoutes.js";
import chatRoutes from "./src/routes/chatRoutes.js";
import eventRoutes from "./src/routes/eventRoutes.js";
import auditTrailRoutes from "./src/routes/auditTrailRoutes.js";
import financialSettingsRoutes from "./src/routes/financialSettingsRoutes.js";
import ChatHub from "./src/utils/chatHub.js";

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
  allowedHeaders: ["Content-Type", "Authorization", "X-Restaurant-ID", "X-Tenant-Subdomain"],
  credentials: true
}));

app.use('/uploads', express.static('uploads'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes that don't need tenant context (before tenant middleware)
app.use("/api/v1/platform-owner", platformOwnerRoutes);
app.use("/api/public", (await import("./src/routes/publicRoutes.js")).default);
app.use("/api/v1/restaurant/public", (await import("./src/routes/publicRestaurantRoutes.js")).default);

// Chat routes with custom middleware
app.use("/api/v1/chat", tenantMiddleware, (req, res, next) => {
  req.io = io;
  req.chatHub = chatHub;
  next();
}, chatRoutes);

// Apply tenant middleware globally for restaurant-specific routes
app.use(tenantMiddleware);

app.use("/api/v1", userRoutes); 
app.use("/api/v1", categoryRoutes); 
app.use("/api/v1", menuRoutes); 
app.use("/api/v1", orderRoutes);
app.use("/api/v1", eventRoutes);
app.use("/api/v1", auditTrailRoutes);
app.use("/api/v1/restaurant", restaurantRoutes);
app.use("/api/v1/restaurant", restaurantCustomizationRoutes);
app.use("/api/v1/restaurant", restaurantSettingsRoutes);
app.use("/api/v1/restaurant", financialSettingsRoutes);
app.use("/api/v1/tenant", tenantRoutes);

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
  // socket.on('disconnect', (reason) => {
  //   console.log(' Socket.IO disconnection:', socket.id, 'Reason:', reason);
  // });
  
  // // Handle connection errors
  // socket.on('connect_error', (error) => {
  //   console.error('🚨 Socket.IO connection error:', error);
  // });
  
  chatHub.handleConnection(socket);
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
