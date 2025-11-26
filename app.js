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

// Test email configuration on startup
// (async () => {
//   console.log('🔧 Testing email configuration...');
//   const emailWorking = await testEmailConfiguration();
//   if (emailWorking) {
//     console.log('✅ Email service is ready for order confirmations');
//   } else {
//     console.log('❌ Email service failed - order confirmations will not be sent');
//     console.log('💡 Check your EMAIL_USER and EMAIL_PASS environment variables');
//   }
// })();

const app = express();
const server = createServer(app);
export const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000", 
      "https://chopie-resturant-frontend.vercel.app",
      "https://eatery-frontend-chopie.vercel.app",
      "http://localhost:5173", // Vite default port
      "http://localhost:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const chatHub = new ChatHub(io);
export { chatHub };

const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: [process.env.FRONTEND_URL ,process.env.PROD_FRONTEND_URL],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global response sanitizer to prevent undefined values
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    if (data && typeof data === 'object') {
      const sanitized = sanitizeObject(data);
      return originalJson.call(this, sanitized);
    }
    return originalJson.call(this, data);
  };
  next();
});

function sanitizeObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  if (obj && typeof obj === 'object') {
    // Handle Mongoose documents by converting to plain object
    if (obj.toObject && typeof obj.toObject === 'function') {
      obj = obj.toObject();
    }
    
    // Handle ObjectId by converting to string
    if (obj.constructor && obj.constructor.name === 'ObjectId') {
      return obj.toString();
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip Mongoose internal fields but keep _id
      if (key.startsWith('$') || key === '_doc' || key === '__v') {
        continue;
      }
      
      if (value === undefined || value === null) {
        sanitized[key] = null;
      } else if (typeof value === 'object') {
        // Handle ObjectId specifically
        if (value.constructor && value.constructor.name === 'ObjectId') {
          sanitized[key] = value.toString();
        } else {
          sanitized[key] = sanitizeObject(value);
        }
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  return obj;
}

app.use("/api/v1", userRoutes); 
app.use("/api/v1", categoryRoutes); 
app.use("/api/v1", menuRoutes); 
app.use("/api/v1", orderRoutes);
app.use("/api/v1/restaurant", restaurantRoutes);


app.use("/api/v1/chat", (req, res, next) => {
  req.io = io;
  req.chatHub = chatHub;
  next();
}, chatRoutes);

app.get("/test", (req, res) => {
  res.send("Server is working Bro");
});

// Test Socket.IO notification endpoint
app.get("/test-notification", (req, res) => {
  console.log('🧪 Testing Socket.IO notification...');
  
  const testOrderData = {
    orderId: 'test-' + Date.now(),
    orderNumber: 'TEST-001',
    tableNumber: '5',
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    customerPhone: '+1234567890',
    items: [{ name: 'Test Pizza', quantity: 1, totalPrice: 15.99 }],
    totalAmount: 15.99,
    status: 'pending',
    createdAt: new Date()
  };
  
  io.emit('newOrder', testOrderData);
  console.log('✅ Test notification sent via Socket.IO');
  
  res.json({
    status: true,
    message: 'Test notification sent successfully',
    data: testOrderData
  });
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

// app.get("/test-email", async (req, res) => {
//   try {
//     const { testEmailConfiguration } = await import("./src/utils/emailService.js");
//     const isWorking = await testEmailConfiguration();
//     res.json({ 
//       status: isWorking, 
//       message: isWorking ? "Email service is working" : "Email service failed"
//     });
//   } catch (error) {
//     res.status(500).json({ status: false, message: error.message });
//   }
// });

// app.post("/test-send-email", async (req, res) => {
//   try {
//     const { email } = req.body;
//     if (!email) {
//       return res.status(400).json({ status: false, message: "Email address required" });
//     }
    
//     const { sendOrderConfirmationEmail } = await import("./src/utils/emailService.js");
//     const result = await sendOrderConfirmationEmail(email, "Test User", {
//       orderNumber: "TEST-001",
//       tableNumber: "5",
//       items: [{ name: "Test Pizza", quantity: 1, totalPrice: 15.99 }],
//       totalAmount: 15.99
//     });
    
//     res.json({ 
//       status: result.success, 
//       message: result.success ? "Test email sent successfully" : "Test email failed",
//       error: result.error || null
//     });
//   } catch (error) {
//     res.status(500).json({ status: false, message: error.message });
//   }
// });

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
