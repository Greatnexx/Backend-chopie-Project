import express from 'express';
import { createOrder, deleteOrder, getAllOrders, getOrderById, trackOrder, searchOrder } from '../Controllers/order.js';
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
    const updatedOrder = await Order.findOneAndUpdate(
      { orderNumber },
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

router.post('/order', createOrder);
router.get('/order', getAllOrders);
// router.patch('/order/:orderId', updateOrder);
router.get('/order/:orderId', getOrderById);
router.delete('/order/:orderId', deleteOrder);
router.get('/order/:orderNumber/track', trackOrder);
router.get('/order/search/:searchTerm', searchOrder);
router.patch("/order/:orderNumber", updateOrder);

export default router;