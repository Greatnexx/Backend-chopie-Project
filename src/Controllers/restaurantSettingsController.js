import Restaurant from "../models/restaurantModel.js";

// Get restaurant settings
export const getRestaurantSettings = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurantId);
    
    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: "Restaurant not found"
      });
    }

    res.json({
      status: true,
      data: {
        allowOnlineOrdering: restaurant.settings?.allowOnlineOrdering ?? true,
        requireTableNumber: restaurant.settings?.requireTableNumber ?? true,
        enableVipTables: restaurant.settings?.enableVipTables ?? true,
        subdomain: restaurant.subdomain,
        operatingHours: restaurant.operatingHours || {
          monday: { open: '09:00', close: '22:00', closed: false },
          tuesday: { open: '09:00', close: '22:00', closed: false },
          wednesday: { open: '09:00', close: '22:00', closed: false },
          thursday: { open: '09:00', close: '22:00', closed: false },
          friday: { open: '09:00', close: '23:00', closed: false },
          saturday: { open: '09:00', close: '23:00', closed: false },
          sunday: { open: '10:00', close: '21:00', closed: false }
        },
        contactInfo: restaurant.contactInfo || {
          phone: restaurant.phone || '',
          email: restaurant.email || '',
          website: '',
          socialMedia: { facebook: '', instagram: '', twitter: '' }
        },
        deliverySettings: restaurant.deliverySettings || {
          enabled: true,
          radius: 5,
          minOrder: 20,
          deliveryFee: 3.99
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

// Update restaurant settings
export const updateRestaurantSettings = async (req, res) => {
  try {
    const {
      allowOnlineOrdering,
      requireTableNumber,
      enableVipTables,
      operatingHours,
      contactInfo,
      deliverySettings
    } = req.body;

    const updateData = {};

    // Update general settings
    if (allowOnlineOrdering !== undefined) {
      updateData['settings.allowOnlineOrdering'] = allowOnlineOrdering;
    }
    if (requireTableNumber !== undefined) {
      updateData['settings.requireTableNumber'] = requireTableNumber;
    }
    if (enableVipTables !== undefined) {
      updateData['settings.enableVipTables'] = enableVipTables;
    }

    // Update operating hours
    if (operatingHours) {
      updateData.operatingHours = operatingHours;
    }

    // Update contact info
    if (contactInfo) {
      updateData.contactInfo = contactInfo;
    }

    // Update delivery settings
    if (deliverySettings) {
      updateData.deliverySettings = deliverySettings;
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.restaurantId,
      { $set: updateData },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: "Restaurant not found"
      });
    }

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
      message: error.message
    });
  }
};

// Get restaurant public info (for customer-facing pages)
export const getRestaurantPublicInfo = async (req, res) => {
  try {
    const { subdomain } = req.params;
    
    const restaurant = await Restaurant.findOne({
      subdomain: subdomain.toLowerCase(),
      isActive: true,
      isApproved: true
    });

    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: "Restaurant not found"
      });
    }

    // Check if restaurant is currently open
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];
    const prevDay = days[(now.getDay() + 6) % 7];
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM format

    const checkOpen = (hours, time) => {
      if (!hours || hours.closed) return false;
      const overnight = hours.close <= hours.open; // e.g. 23:00 - 04:00
      if (overnight) return time >= hours.open || time < hours.close;
      return time >= hours.open && time < hours.close;
    };

    const todayHours = restaurant.operatingHours?.[currentDay];
    const prevHours = restaurant.operatingHours?.[prevDay];

    // Open if today's hours match, OR if yesterday was overnight and we're still in that window
    const isOpen = checkOpen(todayHours, currentTime) ||
                   (prevHours && !prevHours.closed && prevHours.close <= prevHours.open && currentTime < prevHours.close);

    res.json({
      status: true,
      data: {
        id: restaurant._id,
        name: restaurant.name,
        address: restaurant.address,
        branding: restaurant.branding,
        settings: {
          allowOnlineOrdering: restaurant.settings?.allowOnlineOrdering ?? true,
          requireTableNumber: restaurant.settings?.requireTableNumber ?? true
        },
        operatingHours: restaurant.operatingHours,
        contactInfo: restaurant.contactInfo,
        deliverySettings: restaurant.deliverySettings,
        isOpen,
        currentStatus: isOpen ? 'Open' : 'Closed'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

// Update restaurant subscription
export const updateSubscription = async (req, res) => {
  try {
    const { plan, status } = req.body;
    
    // Only super admin can update subscriptions
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({
        status: false,
        message: "Access denied"
      });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.restaurantId,
      {
        $set: {
          'subscription.plan': plan,
          'subscription.status': status,
          'subscription.expiresAt': status === 'active' 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            : new Date()
        }
      },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: "Restaurant not found"
      });
    }

    res.json({
      status: true,
      message: "Subscription updated successfully",
      data: restaurant.subscription
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

// Get restaurant analytics summary
export const getRestaurantAnalytics = async (req, res) => {
  try {
    const { period = "month" } = req.query;
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
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Import models dynamically to avoid circular dependencies
    const Order = (await import("../models/orderModel.js")).default;
    const Menu = (await import("../models/menuModel.js")).default;
    const RestaurantUser = (await import("../models/restaurantUserModel.js")).default;

    // Get orders for the period
    const orders = await Order.find({
      restaurantId: req.restaurantId,
      createdAt: { $gte: startDate },
      status: { $ne: "cancelled" }
    });

    // Get menu items count
    const menuItemsCount = await Menu.countDocuments({
      restaurantId: req.restaurantId,
      isAvailable: true
    });

    // Get staff count
    const staffCount = await RestaurantUser.countDocuments({
      restaurantId: req.restaurantId,
      isActive: true
    });

    // Calculate metrics
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const completedOrders = orders.filter(o => o.status === "completed");
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Popular items (simplified)
    const itemCounts = {};
    orders.forEach(order => {
      order.items?.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    });

    const popularItems = Object.entries(itemCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    res.json({
      status: true,
      data: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        menuItemsCount,
        staffCount,
        popularItems,
        period
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};