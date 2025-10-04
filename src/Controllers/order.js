import Order from "../models/orderModel.js";
import shortid from "shortid";
import { sendOrderConfirmationEmail } from "../utils/emailService.js";
import AuditLog from "../models/auditLogModel.js";
import RejectedOrder from "../models/rejectedOrderModel.js";
import { io } from "../../app.js";

export const createOrder = async (req, res) => {
  try {
    const { tableNumber, customerName, customerEmail, customerPhone, items, totalAmount, confirmDuplicate } =
      req.body;

    // Validate required fields
    if (!tableNumber || !customerName || !customerEmail || !items || !totalAmount) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields",
      });
    }

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Items array is required and cannot be empty",
      });
    }

    // Check for duplicate orders (within last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const existingOrder = await Order.findOne({
      customerEmail,
      totalAmount,
      createdAt: { $gte: thirtyMinutesAgo },
      status: { $in: ["pending", "Preparing"] }
    });

    if (existingOrder && !confirmDuplicate) {
      // Check if cart items match
      const existingItems = existingOrder.items.map(item => `${item.name}-${item.quantity}-${item.specialInstructions || ''}`);
      const newItems = items.map(item => `${item.name}-${item.quantity}-${item.specialInstructions || ''}`);
      
      if (existingItems.length === newItems.length && existingItems.every(item => newItems.includes(item))) {
        return res.status(409).json({
          status: false,
          isDuplicate: true,
          message: "Duplicate order detected",
          existingOrder: {
            orderNumber: existingOrder.orderNumber,
            createdAt: existingOrder.createdAt
          }
        });
      }
    }

    const order = await Order.create({
      orderNumber: shortid.generate(),
      tableNumber,
      customerName,
      customerEmail,
      customerPhone,
      items,
      totalAmount,
    });

    // Send confirmation email
    try {
      await sendOrderConfirmationEmail(order);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    // Emit real-time notification
    io.emit('newOrder', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      tableNumber: order.tableNumber,
    });

    res.status(201).json({
      status: true,
      message: "Order created successfully",
      data: order,
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
    let query = {};
    
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
      data: orders,
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

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ status: false, message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ status: false, message: "Order already accepted" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: "accepted", assignedTo: userId },
      { new: true }
    ).populate("assignedTo", "name email");

    await AuditLog.create({
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

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ status: false, message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({ status: false, message: "Order no longer available" });
    }

    // Update order status to cancelled
    await Order.findByIdAndUpdate(orderId, { status: "cancelled" });

    // Record rejection
    await RejectedOrder.create({ userId, orderId });

    await AuditLog.create({
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

export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;
    const ipAddress = req.ip;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ status: false, message: "Order not found" });
    }

    if (order.assignedTo?.toString() !== userId.toString() && req.user.role === "SubUser") {
      return res.status(403).json({ status: false, message: "Not authorized" });
    }

    const statusFlow = {
      accepted: "Preparing",
      Preparing: "completed",
    };

    const nextStatus = statusFlow[order.status];
    if (!nextStatus) {
      return res.status(400).json({ status: false, message: "Cannot update status" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: nextStatus },
      { new: true }
    );

    await AuditLog.create({
      userId,
      orderId,
      action: "UPDATE_STATUS",
      details: `Updated order ${order.orderNumber} to ${nextStatus}`,
      ipAddress,
    });

    io.emit('orderStatusUpdated', { orderId, status: nextStatus });

    res.json({ status: true, data: updatedOrder });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// Track order by order number
export const trackOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber });

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
          return "20-25 minutes";
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
          description: "Kitchen is preparing your order",
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
          description: "Order ready and delivered to your table",
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
        phone: "+234 801 234 5678", // Default since no phone in model
        email: order.customerEmail,
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
    const order = await Order.findById(orderId);

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
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }
    const deletedOrder = await Order.findByIdAndDelete(orderId);


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
}