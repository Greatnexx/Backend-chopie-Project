import RestaurantUser from "../models/restaurantUserModel.js";
import AuditLog from "../models/auditLogModel.js";
import jwt from "jsonwebtoken";
import { sendUserCredentialsEmail } from "../utils/emailService.js";


const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

const logAction = async (userId, action, details, ipAddress) => {
  try {
    await AuditLog.create({ userId, action, details, ipAddress });
  } catch (error) {
    console.error("Audit log error:", error);
  }
};

export const loginRestaurantUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;

    const user = await RestaurantUser.findOne({ email, isActive: true });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user._id);
    await logAction(user._id, "LOGIN", "User logged in", ipAddress);

    res.json({
      status: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

export const createRestaurantUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const ipAddress = req.ip;

    const existingUser = await RestaurantUser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: false,
        message: "User already exists",
      });
    }

    const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    
    const user = await RestaurantUser.create({ name, email, password: generatedPassword, role });
    await logAction(req.user._id, "CREATE_USER", `Created user: ${email}`, ipAddress);

    // Send credentials via email immediately
    try {
      await sendUserCredentialsEmail({ name, email, password: generatedPassword, role });
      console.log(`Credentials email processed for ${email}`);
    } catch (error) {
      console.log(`Credentials email error for ${email}:`, error.message);
    }

    res.status(201).json({
      status: true,
      message: "User created successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "User creation failed",
      error: error.message,
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    console.log('getAllUsers called by user:', req.user?.email, 'role:', req.user?.role);
    const users = await RestaurantUser.find({}).select("-password");
    console.log('Found users:', users.length);
    console.log('Users data:', users.map(u => ({ name: u.name, email: u.email, role: u.role })));
    res.json({ status: true, data: users });
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ status: false, message: error.message });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    const ipAddress = req.ip;

    const user = await RestaurantUser.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    ).select("-password");

    await logAction(
      req.user._id,
      "TOGGLE_USER_STATUS",
      `${isActive ? "Activated" : "Deactivated"} user: ${user.email}`,
      ipAddress
    );

    res.json({ status: true, data: user });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const awardStar = async (req, res) => {
  try {
    const { userId } = req.params;
    const ipAddress = req.ip;

    const user = await RestaurantUser.findByIdAndUpdate(
      userId,
      { $inc: { stars: 1 } },
      { new: true }
    ).select("-password");

    await logAction(
      req.user._id,
      "AWARD_STAR",
      `Awarded star to: ${user.email}`,
      ipAddress
    );

    res.json({ status: true, data: user });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const { period = "day" } = req.query;
    const now = new Date();
    let startDate;

    switch (period) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const Order = (await import("../models/orderModel.js")).default;
    
    const orders = await Order.find({
      createdAt: { $gte: startDate },
      status: { $ne: "cancelled" }
    });

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const completedOrders = orders.filter(o => o.status === "completed");
    const avgOrderTime = 25; // minutes - you can calculate this based on timestamps
    
    const delayedOrders = orders.filter(o => {
      const timeDiff = (new Date() - new Date(o.createdAt)) / (1000 * 60);
      return timeDiff > 30 && o.status !== "completed";
    });
    
    const fastOrders = completedOrders.filter(o => {
      const timeDiff = (new Date(o.updatedAt) - new Date(o.createdAt)) / (1000 * 60);
      return timeDiff < 20;
    });

    res.json({
      status: true,
      data: {
        totalRevenue,
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        delayedOrders: delayedOrders.length,
        fastOrders: fastOrders.length,
        avgOrderTime,
        period
      }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({})
      .populate("userId", "name email role")
      .populate("orderId", "orderNumber")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ status: true, data: logs });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const searchOrders = async (req, res) => {
  try {
    const { q } = req.query;
    const Order = (await import("../models/orderModel.js")).default;
    
    let query = {};
    if (req.user.role === "SubUser") {
      query.assignedTo = req.user._id;
    }

    if (q) {
      query.$or = [
        { orderNumber: { $regex: q, $options: "i" } },
        { customerName: { $regex: q, $options: "i" } },
        { customerEmail: { $regex: q, $options: "i" } },
      ];
    }

    const orders = await Order.find(query)
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ status: true, data: orders });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;
    const ipAddress = req.ip;

    const user = await RestaurantUser.findById(userId);
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(400).json({
        status: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    await logAction(userId, "CHANGE_PASSWORD", "Password changed", ipAddress);

    res.json({ status: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const toggleMenuAvailability = async (req, res) => {
  try {
    const { menuId } = req.params;
    const { available } = req.body;
    const ipAddress = req.ip;

    const Menu = (await import("../models/menuModel.js")).default;
    const menu = await Menu.findByIdAndUpdate(
      menuId,
      { available },
      { new: true }
    );

    if (!menu) {
      return res.status(404).json({ status: false, message: "Menu item not found" });
    }

    await logAction(
      req.user._id,
      "TOGGLE_MENU",
      `${available ? "Enabled" : "Disabled"} menu: ${menu.name}`,
      ipAddress
    );

    res.json({ status: true, data: menu });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getAllMenuItems = async (req, res) => {
  try {
    const Menu = (await import("../models/menuModel.js")).default;
    const menus = await Menu.find({}).populate("category", "name");
    res.json({ status: true, data: menus });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const ipAddress = req.ip;

    const user = await RestaurantUser.findById(userId);
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    if (user.role === "SuperAdmin") {
      return res.status(400).json({ status: false, message: "Cannot delete SuperAdmin" });
    }

    await RestaurantUser.findByIdAndDelete(userId);
    await logAction(req.user._id, "DELETE_USER", `Deleted user: ${user.email}`, ipAddress);

    res.json({ status: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

