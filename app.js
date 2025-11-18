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

dotenv.config({ quiet: true });
connectDB();

const app = express();
const server = createServer(app);
export const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const chatHub = new ChatHub(io);
export { chatHub };

const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: [process.env.FRONTEND_URL || "http://localhost:3000", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

io.on('connection', (socket) => {
  chatHub.handleConnection(socket);
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
