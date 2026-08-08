import axios from "axios";
import PlatformOwner from "../models/platformOwnerModel.js";
import Restaurant from "../models/restaurantModel.js";
import RestaurantUser from "../models/restaurantUserModel.js";
import Order from "../models/orderModel.js";
import AuditLog from "../models/auditLogModel.js";
import generateToken from "../utils/generateToken.js";
import { EMAIL_TEMPLATES, sendTemplateEmail } from "../utils/email.js";

// Platform Owner Login
export const loginPlatformOwner = async (req, res) => {
  try {
    const { email, password } = req.body;

    const owner = await PlatformOwner.findOne({ email, isActive: true });
    if (!owner || !(await owner.comparePassword(password))) {
      return res.status(401).json({
        status: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(owner._id);

    res.json({
      status: true,
      message: "Login successful",
      data: {
        owner: {
          _id: owner._id,
          name: owner.name,
          email: owner.email,
          role: owner.role,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// Get Platform Analytics
export const getPlatformAnalytics = async (req, res) => {
  try {
    // Restaurant Stats
    const totalRestaurants = await Restaurant.countDocuments();
    const activeRestaurants = await Restaurant.countDocuments({ isActive: true });
    const pendingRestaurants = await Restaurant.countDocuments({ isActive: false });

    // User Stats
    const totalUsers = await RestaurantUser.countDocuments();
    const activeUsers = await RestaurantUser.countDocuments({ isActive: true });

    // Order Stats
    const totalOrders = await Order.countDocuments();
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    });

    // Revenue Stats (assuming orders have totalAmount field)
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    const todayRevenue = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
        }
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);

    // Monthly Growth
    const currentMonth = new Date();
    const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    
    const currentMonthRestaurants = await Restaurant.countDocuments({
      createdAt: { $gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1) }
    });

    const lastMonthRestaurants = await Restaurant.countDocuments({
      createdAt: { 
        $gte: lastMonth,
        $lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      }
    });

    res.json({
      status: true,
      data: {
        restaurants: {
          total: totalRestaurants,
          active: activeRestaurants,
          pending: pendingRestaurants,
          monthlyGrowth: currentMonthRestaurants,
          lastMonthGrowth: lastMonthRestaurants
        },
        users: {
          total: totalUsers,
          active: activeUsers
        },
        orders: {
          total: totalOrders,
          today: todayOrders
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          today: todayRevenue[0]?.total || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// Get All Restaurants with Details
export const getAllRestaurantsDetailed = async (req, res) => {
  try {
    const restaurants = await Restaurant.find()
      .populate('subscription')
      .sort({ createdAt: -1 });

    // Get user count for each restaurant
    const restaurantsWithStats = await Promise.all(
      restaurants.map(async (restaurant) => {
        const userCount = await RestaurantUser.countDocuments({ 
          restaurantId: restaurant._id 
        });
        const orderCount = await Order.countDocuments({ 
          restaurantId: restaurant._id 
        });
        
        return {
          ...restaurant.toObject(),
          stats: {
            userCount,
            orderCount
          }
        };
      })
    );

    res.json({
      status: true,
      data: restaurantsWithStats
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// Approve Restaurant
export const approveRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const existingRestaurant = await Restaurant.findById(restaurantId);

    if (!existingRestaurant) {
      return res.status(404).json({ status: false, message: "Restaurant approval request not found" });
    }

    if (existingRestaurant.isApproved) {
      return res.status(400).json({
        status: false,
        message: "Restaurant is already approved"
      });
    }

    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const cloudflareToken = process.env.CLOUDFLARE_API_TOKEN;
    const vercelDnsTarget = process.env.VERCEL_DNS_TARGET || "chopie.ng";

    if (!zoneId || !cloudflareToken) {
      return res.status(500).json({
        status: false,
        message: "Cloudflare DNS configuration is missing"
      });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      { isApproved: true, isActive: true },
      { new: true }
    );

    const dnsPayload = {
      name: `${restaurant.subdomain}.chopie.ng`,
      ttl: 3600,
      type: "CNAME",
      comment: "Domain verification record",
      content: vercelDnsTarget,
      proxied: false
    };

    await axios.post(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
      dnsPayload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cloudflareToken}`
        }
      }
    );

    sendTemplateEmail(
      { email: restaurant.email, name: restaurant.name },
      EMAIL_TEMPLATES.WELCOME,
      {
        Resturant_Name: restaurant.name,
        Email: restaurant.email,
        Phone: restaurant.phone || '',
        Address: restaurant.address || '',
        Subdomain: restaurant.subdomain || '',
        Menu_URL: `https://${restaurant.subdomain}.app.chopie.ng`,
        Dashboard_URL: `https://chopie.ng/restaurant/login`
      }
    );

    res.json({
      status: true,
      message: `${restaurant.name} has been approved successfully`,
      data: restaurant
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Update Restaurant Status
export const updateRestaurantStatus = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { isActive } = req.body;

    const restaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      { isActive },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: "Restaurant not found",
      });
    }

    res.json({
      status: true,
      message: `Restaurant ${isActive ? 'activated' : 'suspended'} successfully`,
      data: restaurant
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// Get Platform Performance Metrics
export const getPerformanceMetrics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyOrders = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
          revenue: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const topRestaurants = await Order.aggregate([
      {
        $group: {
          _id: "$restaurantId",
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" }
        }
      },
      {
        $lookup: {
          from: "restaurants",
          localField: "_id",
          foreignField: "_id",
          as: "restaurant"
        }
      },
      { $unwind: "$restaurant" },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      status: true,
      data: { dailyOrders, topRestaurants }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Get System Health Metrics
export const getSystemHealth = async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    // System activity metrics
    const metrics = {
      orders: {
        last24h: await Order.countDocuments({ createdAt: { $gte: last24Hours } }),
        lastHour: await Order.countDocuments({ createdAt: { $gte: lastHour } })
      },
      restaurants: {
        active: await Restaurant.countDocuments({ isActive: true }),
        total: await Restaurant.countDocuments()
      },
      users: {
        active: await RestaurantUser.countDocuments({ isActive: true }),
        total: await RestaurantUser.countDocuments()
      },
      auditLogs: {
        last24h: await AuditLog.countDocuments({ timestamp: { $gte: last24Hours } })
      }
    };

    // Calculate health score
    const healthScore = Math.min(100, 
      (metrics.restaurants.active / Math.max(metrics.restaurants.total, 1)) * 40 +
      (metrics.users.active / Math.max(metrics.users.total, 1)) * 30 +
      (metrics.orders.last24h > 0 ? 30 : 0)
    );

    res.json({
      status: true,
      data: { ...metrics, healthScore: Math.round(healthScore) }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Get Real-time Activity Feed
export const getActivityFeed = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const { restaurantId } = req.query; // Allow filtering by specific restaurant
    
    // Build query - platform owner can see all or filter by restaurant
    const query = {};
    if (restaurantId) {
      query.restaurantId = restaurantId;
    }
    
    const activities = await AuditLog.find(query)
      .populate('userId', 'name email role')
      .populate('restaurantId', 'name subdomain')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ status: true, data: activities });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Get Revenue Analytics
export const getRevenueAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    let dateRange;
    
    switch (period) {
      case '7d':
        dateRange = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateRange = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dateRange = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateRange = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const revenueData = await Order.aggregate([
      { $match: { createdAt: { $gte: dateRange } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totalRevenue = revenueData.reduce((sum, day) => sum + day.revenue, 0);
    const totalOrders = revenueData.reduce((sum, day) => sum + day.orders, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.json({
      status: true,
      data: {
        chartData: revenueData,
        summary: {
          totalRevenue,
          totalOrders,
          avgOrderValue: Math.round(avgOrderValue * 100) / 100
        }
      }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Get Restaurant Growth Analytics
export const getGrowthAnalytics = async (req, res) => {
  try {
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 12);

    const monthlyGrowth = await Restaurant.aggregate([
      { $match: { createdAt: { $gte: last12Months } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const userGrowth = await RestaurantUser.aggregate([
      { $match: { createdAt: { $gte: last12Months } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    res.json({
      status: true,
      data: { monthlyGrowth, userGrowth }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Get Restaurant Details
export const getRestaurantDetails = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId)
      .populate('subscription');

    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: "Restaurant not found",
      });
    }

    // Get detailed stats
    const userCount = await RestaurantUser.countDocuments({ 
      restaurantId: restaurant._id 
    });
    
    const orderStats = await Order.aggregate([
      { $match: { restaurantId: restaurant._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          avgOrderValue: { $avg: "$totalAmount" }
        }
      }
    ]);

    // Recent orders
    const recentOrders = await Order.find({ restaurantId: restaurant._id })
      .sort({ createdAt: -1 })
      .limit(10);

    // Monthly revenue trend
    const monthlyRevenue = await Order.aggregate([
      { $match: { restaurantId: restaurant._id } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 6 }
    ]);

    const stats = orderStats[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 };

    res.json({
      status: true,
      data: {
        restaurant,
        stats: {
          userCount,
          ...stats
        },
        recentOrders,
        monthlyRevenue
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// Get Alert Summary
export const getAlerts = async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const alerts = [];

    // Check for inactive restaurants
    const inactiveRestaurants = await Restaurant.countDocuments({ isActive: false });
    if (inactiveRestaurants > 0) {
      alerts.push({
        type: 'warning',
        title: 'Inactive Restaurants',
        message: `${inactiveRestaurants} restaurants are currently inactive`,
        count: inactiveRestaurants
      });
    }

    // Check for low order activity
    const recentOrders = await Order.countDocuments({ createdAt: { $gte: last24Hours } });
    if (recentOrders < 10) {
      alerts.push({
        type: 'info',
        title: 'Low Order Activity',
        message: `Only ${recentOrders} orders in the last 24 hours`,
        count: recentOrders
      });
    }

    // Check for new restaurant registrations
    const newRestaurants = await Restaurant.countDocuments({ 
      createdAt: { $gte: last24Hours },
      isActive: false 
    });
    if (newRestaurants > 0) {
      alerts.push({
        type: 'success',
        title: 'New Registrations',
        message: `${newRestaurants} new restaurants awaiting approval`,
        count: newRestaurants
      });
    }

    res.json({ status: true, data: alerts });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};