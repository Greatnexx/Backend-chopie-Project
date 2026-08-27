import Order from "../models/orderModel.js";
import { generateOrderNumber } from "../utils/orderNumberGenerator.js";
import AuditLog from "../models/auditLogModel.js";
import RejectedOrder from "../models/rejectedOrderModel.js";
import { io } from "../../app.js";

export const createOrder = async (req, res) => {
  try {
    const { tableNumber, customerName, customerPhone, items, totalAmount, confirmDuplicate } = req.body;
    // Basic validation
    if (!tableNumber || !customerName || !customerPhone || !items || !totalAmount) {
      return res.status(400).json({ status: false, message: "Missing required fields" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: false, message: "Items array is required" });
    }

    // Check for duplicate orders (within last 5 minutes) - with tenant filtering
    if (!confirmDuplicate) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const duplicateQuery = {
        customerName,
        tableNumber,
        totalAmount,
        createdAt: { $gte: fiveMinutesAgo }
      };
      
      // Add tenant filtering if available
      if (req.restaurantId) {
        duplicateQuery.restaurantId = req.restaurantId;
      }
      
      const existingOrder = await Order.findOne(duplicateQuery);
      
      if (existingOrder) {
        return res.status(409).json({
          status: false,
          message: "Duplicate order detected",
          isDuplicate: true,
          existingOrder: {
            orderNumber: existingOrder.orderNumber,
            createdAt: existingOrder.createdAt
          }
        });
      }
    }
    // Get restaurant information for order number prefix
    let restaurant = null;
    if (req.restaurantId) {
      const Restaurant = (await import("../models/restaurantModel.js")).default;
      restaurant = await Restaurant.findById(req.restaurantId);
    }
    
    const orderNumber = await generateOrderNumber(restaurant);
    const orderData = {
      restaurantId: req.restaurantId,
      orderNumber,
      tableNumber,
      customerName,
      customerPhone,
      items,
      totalAmount,
    };
    
    // Auto-accept staff orders
    if (req.body.orderSource === 'staff' && req.body.createdBy) {
      orderData.status = 'accepted';
      orderData.orderStatus = 'accepted';
      orderData.assignedTo = req.body.createdBy;
    }
    
    const order = await Order.create(orderData);
    // Emit new order notification via Socket.IO
    io.emit('newOrder', {
      orderId: order._id,
      orderNumber,
      tableNumber,
      customerName,
      customerPhone,
      items,
      totalAmount,
      status: 'pending',
      createdAt: order.createdAt || new Date()
    });
    // Send response with order details for modal display
    res.status(201).json({
      status: true,
      message: "Order placed successfully!",
      data: {
        orderNumber,
        tableNumber,
        customerName,
        customerPhone,
        items,
        totalAmount,
        orderTime: order.createdAt || new Date(),
        estimatedTime: "5-10 minutes",
        _id: order._id,
        createdAt: order.createdAt || new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        message: "Authentication required",
      });
    }

    let query = {};
    
    // Add tenant filtering
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }
    
    if (req.user.role === "SubUser") {
      // Get rejected order IDs for this user
      const rejectedOrders = await RejectedOrder.find({ userId: req.user._id }).select('orderId');
      const rejectedOrderIds = rejectedOrders.map(r => r.orderId);
      
      query.$or = [
        { assignedTo: req.user._id },
        { 
          status: "pending",
          _id: { $nin: rejectedOrderIds }
        }
      ];
    }

    const orders = await Order.find(query)
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: true,
      count: orders.length,
      data: orders || [],
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

export const acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;
    const ipAddress = req.ip;

    // Find order with tenant filtering
    const query = { _id: orderId };
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }
    
    const order = await Order.findOne(query);
    if (!order) {
      return res.status(404).json({ status: false, message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ status: false, message: "Order already accepted" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: "accepted", orderStatus: "accepted", assignedTo: userId },
      { new: true }
    ).populate("assignedTo", "name email");

    await AuditLog.create({
      restaurantId: req.restaurantId || req.user.restaurantId,
      userId,
      orderId,
      action: "ACCEPT_ORDER",
      details: `Accepted order ${order.orderNumber}`,
      ipAddress,
    });

    io.emit('orderAccepted', { orderId, assignedTo: req.user.name });

    res.json({ status: true, data: updatedOrder });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const rejectOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;
    const ipAddress = req.ip;

    // Find order with tenant filtering
    const query = { _id: orderId };
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }
    
    const order = await Order.findOne(query);
    if (!order) {
      return res.status(404).json({ status: false, message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ status: false, message: "Order no longer available" });
    }

    await Order.findByIdAndUpdate(orderId, { status: "cancelled", orderStatus: "cancelled" });

    // Record rejection
    await RejectedOrder.create({ userId, orderId });

    await AuditLog.create({
      restaurantId: req.restaurantId || req.user.restaurantId,
      userId,
      orderId,
      action: "REJECT_ORDER",
      details: `Rejected order ${order.orderNumber}`,
      ipAddress,
    });

    io.emit('orderRejected', { orderId, rejectedBy: req.user.name });

    res.json({ status: true, message: "Order rejected" });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items, totalAmount, customerNotes } = req.body;
    const userId = req.user._id;
    const ipAddress = req.ip;

    // Find order with tenant filtering
    const query = { _id: orderId };
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }
    
    const order = await Order.findOne(query);
    if (!order) {
      return res.status(404).json({ status: false, message: "Order not found" });
    }

    // Only allow modification if order is accepted or preparing (not completed/cancelled)
    if (!['accepted', 'Preparing'].includes(order.status)) {
      return res.status(400).json({ 
        status: false, 
        message: `Cannot modify order with status: ${order.status}` 
      });
    }

    // Store original order for audit
    const originalItems = order.items;
    const originalTotal = order.totalAmount;

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { 
        items, 
        totalAmount, 
        customerNotes: customerNotes || order.customerNotes,
        lastModified: new Date(),
        modifiedBy: userId
      },
      { new: true }
    ).populate("assignedTo", "name email");

    await AuditLog.create({
      restaurantId: req.restaurantId || req.user.restaurantId,
      userId,
      orderId,
      action: "MODIFY_ORDER",
      details: `Modified order ${order.orderNumber}. Items: ${originalItems.length} → ${items.length}, Total: ${originalTotal} → ${totalAmount}`,
      ipAddress,
    });

    io.emit('orderModified', { 
      orderId, 
      modifiedBy: req.user.name,
      newTotal: totalAmount 
    });

    res.json({ status: true, data: updatedOrder });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;
    const ipAddress = req.ip;

    // Find order with tenant filtering
    const query = { _id: orderId };
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }
    
    const order = await Order.findOne(query);
    if (!order) {
      return res.status(404).json({ status: false, message: "Order not found" });
    }

    if (['served', 'completed'].includes(order.orderStatus || order.status)) {
      return res.status(400).json({ 
        status: false, 
        message: "Cannot cancel a served order" 
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { 
        status: "cancelled",
        orderStatus: "cancelled",
        cancellationReason: reason,
        cancelledBy: userId,
        cancelledAt: new Date()
      },
      { new: true }
    );

    await AuditLog.create({
      restaurantId: req.restaurantId || req.user.restaurantId,
      userId,
      orderId,
      action: "CANCEL_ORDER",
      details: `Cancelled order ${order.orderNumber}. Reason: ${reason || 'No reason provided'}`,
      ipAddress,
    });

    io.emit('orderCancelled', { 
      orderId, 
      cancelledBy: req.user.name,
      reason 
    });

    res.json({ status: true, data: updatedOrder });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;
    const ipAddress = req.ip;

    // Find order with tenant filtering
    const query = { _id: orderId };
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }
    
    const order = await Order.findOne(query);
    if (!order) {
      return res.status(404).json({ status: false, message: "Order not found" });
    }

    if (order.assignedTo?.toString() !== userId.toString() && req.user.role === "SubUser") {
      return res.status(403).json({ status: false, message: "Not authorized" });
    }

    const statusFlow = {
      accepted: "Preparing",
      Preparing: "served",
    };

    const nextOrderStatus = statusFlow[order.orderStatus || order.status];
    if (!nextOrderStatus) {
      return res.status(400).json({ status: false, message: "Cannot update status" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { orderStatus: nextOrderStatus, status: nextOrderStatus === 'served' ? 'completed' : nextOrderStatus },
      { new: true }
    );

    await AuditLog.create({
      restaurantId: req.restaurantId || req.user.restaurantId,
      userId,
      orderId,
      action: "UPDATE_STATUS",
      details: `Updated order ${order.orderNumber} to ${nextOrderStatus}`,
      ipAddress,
    });

    io.emit('orderStatusUpdated', { orderId, orderStatus: nextOrderStatus });

    res.json({ status: true, data: updatedOrder });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Search order by order number, email, or phone
export const searchOrder = async (req, res) => {
  try {
    const { searchTerm } = req.params;
    
    // Build base query with tenant filtering
    const baseQuery = {};
    if (req.restaurantId) {
      baseQuery.restaurantId = req.restaurantId;
    }
    
    // Try to find order by order number first
    let order = await Order.findOne({ ...baseQuery, orderNumber: searchTerm });
    
    if (!order) {
      // Try to find by phone number (get most recent)
      order = await Order.findOne({ ...baseQuery, customerPhone: searchTerm }).sort({ createdAt: -1 });
    }
    
    if (!order) {
      // Try to find by customer name (case-insensitive, get most recent)
      order = await Order.findOne({ 
        ...baseQuery, 
        customerName: { $regex: searchTerm, $options: 'i' } 
      }).sort({ createdAt: -1 });
    }
    
    if (!order) {
      return res.status(404).json({
        status: false,
        message:
          "Order not found. Please check your order number, phone number, or customer name and try again.",
      });
    }

    // Helper function to calculate estimated time based on YOUR status values
    const getEstimatedTime = (order) => {
      const now = new Date();
      const orderTime = new Date(order.createdAt);
      const timeDiff = Math.floor((now - orderTime) / (1000 * 60)); // minutes

      switch (order.status) {
        case "pending":
          return "5-10 minutes";
        case "Preparing":
          return `${Math.max(15 - timeDiff, 5)}-${Math.max(
            20 - timeDiff,
            10
          )} minutes`;
        case "completed":
          return "Order completed";
        case "cancelled":
          return "Order cancelled";
        default:
          return "Calculating...";
      }
    };

    // Helper function to create status history based on YOUR status values
    const createStatusHistory = (order) => {
      const baseTime = new Date(order.createdAt);
      const history = [
        {
          status: "pending",
          time: baseTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
          completed: true, // Always completed since order exists
          description: "Order confirmed and payment received",
        },
        {
          status: "Preparing",
          time:
            order.status === "pending"
              ? ""
              : new Date(baseTime.getTime() + 5 * 60000).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }
                ),
          completed: ["Preparing", "completed"].includes(order.status),
          description: "Your order is being prepared",
        },
        {
          status: "completed",
          time:
            order.status === "completed"
              ? new Date(baseTime.getTime() + 20 * 60000).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }
                )
              : "",
          completed: order.status === "completed",
          description: "Order is ready",
        },
      ];

      // Add cancelled status if order is cancelled
      if (order.status === "cancelled") {
        history.push({
          status: "cancelled",
          time: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
          completed: true,
          description: "Order has been cancelled",
        });
      }

      return history;
    };

    // Format the response to match what your React component expects
    const formattedOrder = {
      orderNumber: order.orderNumber,
      status: order.status,
      // Format items based on your structure (no price field)
      items: order.items.map((item) => `${item.name} x${item.quantity}`),
      total: order.totalAmount.toFixed(2),
      estimatedTime: getEstimatedTime(order),
      orderTime: new Date(order.createdAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      customerInfo: {
        name: order.customerName,
        table: `Table ${order.tableNumber}`,
        phone: order.customerPhone || "+234 801 234 5678",
      },
      statusHistory: createStatusHistory(order),
    };

    res.status(200).json({
      status: true,
      message: "Order found successfully",
      data: formattedOrder,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to search order",
      error: error.message,
    });
  }
};

// Track order by order number (kept for backward compatibility)
export const trackOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    // Build query with tenant filtering
    const query = { orderNumber };
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }
    
    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        status: false,
        message:
          "Order not found. Please check your tracking number and try again.",
      });
    }

    // Helper function to calculate estimated time based on YOUR status values
    const getEstimatedTime = (order) => {
      const now = new Date();
      const orderTime = new Date(order.createdAt);
      const timeDiff = Math.floor((now - orderTime) / (1000 * 60)); // minutes

      switch (order.status) {
        case "pending":
          return "5-10 minutes";
        case "Preparing":
          return `${Math.max(15 - timeDiff, 5)}-${Math.max(
            20 - timeDiff,
            10
          )} minutes`;
        case "completed":
          return "Order completed";
        case "cancelled":
          return "Order cancelled";
        default:
          return "Calculating...";
      }
    };

    // Helper function to create status history based on YOUR status values
    const createStatusHistory = (order) => {
      const baseTime = new Date(order.createdAt);
      const history = [
        {
          status: "pending",
          time: baseTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
          completed: true, // Always completed since order exists
          description: "Order confirmed and payment received",
        },
        {
          status: "Preparing",
          time:
            order.status === "pending"
              ? ""
              : new Date(baseTime.getTime() + 5 * 60000).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }
                ),
          completed: ["Preparing", "completed"].includes(order.status),
          description: "Your order is being prepared",
        },
        {
          status: "completed",
          time:
            order.status === "completed"
              ? new Date(baseTime.getTime() + 20 * 60000).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }
                )
              : "",
          completed: order.status === "completed",
          description: "Order is ready",
        },
      ];

      // Add cancelled status if order is cancelled
      if (order.status === "cancelled") {
        history.push({
          status: "cancelled",
          time: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
          completed: true,
          description: "Order has been cancelled",
        });
      }

      return history;
    };

    // Format the response to match what your React component expects
    const formattedOrder = {
      orderNumber: order.orderNumber,
      status: order.status,
      // Format items based on your structure (no price field)
      items: order.items.map((item) => `${item.name} x${item.quantity}`),
      total: order.totalAmount.toFixed(2),
      estimatedTime: getEstimatedTime(order),
      orderTime: new Date(order.createdAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      customerInfo: {
        name: order.customerName,
        table: `Table ${order.tableNumber}`,
        phone: order.customerPhone || "+234 801 234 5678",
      },
      statusHistory: createStatusHistory(order),
    };

    res.status(200).json({
      status: true,
      message: "Order tracked successfully",
      data: formattedOrder,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to fetch order details",
      error: error.message,
    });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Build query with tenant filtering
    const query = { _id: orderId };
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }
    
    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      status: true,
      data: order,
      message: "Order fetched successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
}

// Delete order

export const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Build query with tenant filtering
    const query = { _id: orderId };
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }
    
    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }
    const deletedOrder = await Order.findOneAndDelete(query);

    res.status(200).json({
      status: true,
      message: "Order deleted successfully",
      data: deletedOrder,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to delete order",
      error: error.message,
    });
  }
};

// Get daily payment summary
export const getDailyPaymentSummary = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const matchQuery = {
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      paymentStatus: "paid"
    };
    
    if (req.restaurantId) {
      matchQuery.restaurantId = req.restaurantId;
    }

    const summary = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          total: { $sum: "$totalAmount" }
        }
      }
    ]);

    const result = {
      date: startOfDay.toDateString(),
      cash: { count: 0, total: 0 },
      transfer: { count: 0, total: 0 },
      grandTotal: 0
    };

    summary.forEach(item => {
      result[item._id] = { count: item.count, total: item.total };
      result.grandTotal += item.total;
    });

    res.status(200).json({
      status: true,
      message: "Daily payment summary fetched successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to fetch payment summary",
      error: error.message,
    });
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, cash = 0, transfer = 0 } = req.body;
    const userId = req.user._id;
    const ipAddress = req.ip;

    if (!['unpaid', 'partial', 'paid'].includes(paymentStatus)) {
      return res.status(400).json({ status: false, message: "Invalid payment status" });
    }

    const query = { _id: orderId };
    if (req.restaurantId) query.restaurantId = req.restaurantId;

    const order = await Order.findOne(query);
    if (!order) return res.status(404).json({ status: false, message: "Order not found" });

    const updateData = { paymentStatus };
    if (paymentStatus === 'partial' || paymentStatus === 'paid') {
      updateData.splitPayment = { cash: Number(cash), transfer: Number(transfer) };
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, { new: true });

    await AuditLog.create({
      restaurantId: req.restaurantId || req.user.restaurantId,
      userId,
      orderId,
      action: "UPDATE_PAYMENT_STATUS",
      details: `Updated payment for order ${order.orderNumber} to ${paymentStatus}. Cash: ${cash}, Transfer: ${transfer}`,
      ipAddress,
    });

    io.emit('paymentStatusUpdated', { orderId, paymentStatus });

    res.json({ status: true, data: updatedOrder });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

