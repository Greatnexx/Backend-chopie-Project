import Restaurant from "../models/restaurantModel.js";
import AuditLog from "../models/auditLogModel.js";

const logAction = async (userId, action, details, ipAddress, restaurantId = null) => {
  try {
    const logData = { userId, action, details, ipAddress };
    if (restaurantId) {
      logData.restaurantId = restaurantId;
    }
    await AuditLog.create(logData);
  } catch (error) {
    // Silently handle audit log errors in production
  }
};

// Get restaurant settings
export const getRestaurantSettings = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: "Restaurant not found",
      });
    }

    res.json({
      status: true,
      data: {
        name: restaurant.name,
        email: restaurant.email,
        phone: restaurant.phone,
        address: restaurant.address,
        subdomain: restaurant.subdomain,
        branding: restaurant.branding || {},
        settings: restaurant.settings || {},
        operatingHours: restaurant.operatingHours || {},
        contactInfo: {
          name: restaurant.name,
          phone: restaurant.phone,
          email: restaurant.email,
          website: restaurant.contactInfo?.website || '',
          address: restaurant.address,
          socialMedia: restaurant.contactInfo?.socialMedia || { facebook: '', instagram: '' }
        },
        deliverySettings: restaurant.deliverySettings || {},
        isActive: restaurant.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching restaurant settings",
      error: error.message,
    });
  }
};

// Update restaurant branding
export const updateBranding = async (req, res) => {
  try {
    const { primaryColor, secondaryColor, accentColor, fontFamily, theme } = req.body;
    const ipAddress = req.ip;

    const restaurant = await Restaurant.findById(req.restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: "Restaurant not found",
      });
    }

    const updates = {};
    if (req.file) {
      updates["branding.logo"] = `/uploads/logos/${req.file.filename}`;
    }
    if (primaryColor) updates["branding.primaryColor"] = primaryColor;
    if (secondaryColor) updates["branding.secondaryColor"] = secondaryColor;
    if (accentColor) updates["branding.accentColor"] = accentColor;
    if (fontFamily) updates["branding.fontFamily"] = fontFamily;
    if (theme) updates["branding.theme"] = theme;

    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      req.restaurantId,
      { $set: updates },
      { new: true }
    );

    await logAction(
      req.user._id,
      "UPDATE_BRANDING",
      "Updated restaurant branding",
      ipAddress
    );

    res.json({
      status: true,
      message: "Branding updated successfully",
      data: updatedRestaurant.branding,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error updating branding",
      error: error.message,
    });
  }
};

// Update restaurant settings
export const updateSettings = async (req, res) => {
  try {
    const {
      orderTimeout,
      maxOrdersPerHour,
      enableChat,
      enableEvents,
      workingHours,
      operatingHours,
      contactInfo,
      deliverySettings
    } = req.body;
    const ipAddress = req.ip;

    const updates = {};
    if (orderTimeout) updates["settings.orderTimeout"] = orderTimeout;
    if (maxOrdersPerHour) updates["settings.maxOrdersPerHour"] = maxOrdersPerHour;
    if (enableChat !== undefined) updates["settings.enableChat"] = enableChat;
    if (enableEvents !== undefined) updates["settings.enableEvents"] = enableEvents;
    if (workingHours) updates["settings.workingHours"] = workingHours;
    
    // Handle operating hours
    if (operatingHours) {
      updates.operatingHours = operatingHours;
    }
    
    // Handle contact info - update both contactInfo and basic restaurant fields
    if (contactInfo) {
      updates.contactInfo = contactInfo;
      // Also update basic restaurant fields if they're in contactInfo
      if (contactInfo.name) updates.name = contactInfo.name;
      if (contactInfo.email) updates.email = contactInfo.email;
      if (contactInfo.phone) updates.phone = contactInfo.phone;
      if (contactInfo.address) updates.address = contactInfo.address;
    }
    
    // Handle delivery settings
    if (deliverySettings) {
      updates.deliverySettings = deliverySettings;
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.restaurantId,
      { $set: updates },
      { new: true }
    );

    await logAction(
      req.user._id,
      "UPDATE_SETTINGS",
      "Updated restaurant settings",
      ipAddress,
      req.restaurantId
    );

    res.json({
      status: true,
      message: "Settings updated successfully",
      data: {
        settings: restaurant.settings,
        operatingHours: restaurant.operatingHours,
        contactInfo: restaurant.contactInfo,
        deliverySettings: restaurant.deliverySettings
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error updating settings",
      error: error.message,
    });
  }
};

// Update restaurant basic info
export const updateRestaurantInfo = async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    const ipAddress = req.ip;

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    if (address) updates.address = address;

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.restaurantId,
      updates,
      { new: true }
    );

    await logAction(
      req.user._id,
      "UPDATE_INFO",
      "Updated restaurant information",
      ipAddress
    );

    res.json({
      status: true,
      message: "Restaurant information updated successfully",
      data: {
        name: restaurant.name,
        email: restaurant.email,
        phone: restaurant.phone,
        address: restaurant.address,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error updating restaurant information",
      error: error.message,
    });
  }
};

// Get restaurant dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const Order = (await import("../models/orderModel.js")).default;
    const Menu = (await import("../models/menuModel.js")).default;
    const Category = (await import("../models/categoryModel.js")).default;
    const RestaurantUser = (await import("../models/restaurantUserModel.js")).default;

    const query = { restaurantId: req.restaurantId };

    const [
      totalOrders,
      totalMenuItems,
      totalCategories,
      totalUsers,
      todayOrders,
      activeMenuItems,
    ] = await Promise.all([
      Order.countDocuments(query),
      Menu.countDocuments(query),
      Category.countDocuments(query),
      RestaurantUser.countDocuments(query),
      Order.countDocuments({
        ...query,
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
      Menu.countDocuments({ ...query, available: true }),
    ]);

    res.json({
      status: true,
      data: {
        totalOrders,
        totalMenuItems,
        totalCategories,
        totalUsers,
        todayOrders,
        activeMenuItems,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching dashboard stats",
      error: error.message,
    });
  }
};