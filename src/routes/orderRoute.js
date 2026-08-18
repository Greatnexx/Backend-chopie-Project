import express from 'express';
import { createOrder, deleteOrder, getAllOrders, getOrderById, trackOrder, searchOrder, getDailyPaymentSummary, updateOrder as modifyOrder, cancelOrder, updatePaymentStatus } from '../Controllers/order.js';
import { tenantMiddleware, requireTenant } from '../middlewares/tenantMiddleware.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { protect as restaurantProtect } from '../middlewares/restaurantAuth.js';
const router = express.Router();

// Backward compatible updateOrder function
const updateOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "accepted", "Preparing", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: false,
        message: "Invalid status",
      });
    }

    const Order = (await import('../models/orderModel.js')).default;
    
    // Build query with tenant filtering
    const query = { orderNumber };
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }
    
    const updatedOrder = await Order.findOneAndUpdate(
      query,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }

    res.json({
      status: true,
      data: updatedOrder,
      message: "Order updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to update order",
      error: error.message,
    });
  }
};

// Handle preflight OPTIONS request
router.options('/order', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// Test endpoint
router.get('/order/test', (req, res) => {
  res.json({ status: true, message: 'Order API is working', timestamp: new Date() });
});

// Public routes (no authentication required)
router.post('/order', tenantMiddleware, requireTenant, createOrder);

// Staff order route (requires restaurant authentication)
router.post('/staff-order', restaurantProtect, tenantMiddleware, requireTenant, createOrder);
router.get('/order/search/:searchTerm', tenantMiddleware, searchOrder);
router.get('/order/:orderNumber/track', tenantMiddleware, trackOrder);

// Protected routes (authentication required)
router.get('/order', authenticateToken, tenantMiddleware, getAllOrders);
router.get('/order/payment-summary', authenticateToken, tenantMiddleware, getDailyPaymentSummary);
router.get('/order/:orderId', authenticateToken, tenantMiddleware, getOrderById);
router.put('/order/:orderId', authenticateToken, tenantMiddleware, modifyOrder);
router.post('/order/:orderId/cancel', authenticateToken, tenantMiddleware, cancelOrder);
router.patch('/order/:orderId/payment', authenticateToken, tenantMiddleware, updatePaymentStatus);
router.delete('/order/:orderId', authenticateToken, tenantMiddleware, deleteOrder);
router.patch("/order/:orderNumber", authenticateToken, tenantMiddleware, updateOrder);

export default router;