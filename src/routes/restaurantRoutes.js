import express from 'express';
import { loginRestaurantUser, createRestaurantUser, getAllUsers, toggleUserStatus, awardStar, getAnalytics, getAuditLogs, searchOrders, changePassword, toggleMenuAvailability, getAllMenuItems, deleteUser } from '../Controllers/restaurantAuth.js';
import { acceptOrder, rejectOrder, updateOrderStatus, getAllOrders, getOrderById } from '../Controllers/order.js';
import { protect, authorize } from '../middlewares/restaurantAuth.js';

const router = express.Router();

// Auth routes
router.post('/login', loginRestaurantUser);
router.post('/users', protect, authorize('SuperAdmin'), createRestaurantUser);
router.get('/users', protect, authorize('SuperAdmin'), getAllUsers);
router.patch('/users/:userId/status', protect, authorize('SuperAdmin'), toggleUserStatus);
router.patch('/users/:userId/star', protect, authorize('SuperAdmin', 'TransactionAdmin'), awardStar);
router.delete('/users/:userId', protect, authorize('SuperAdmin'), deleteUser);
router.get('/analytics', protect, authorize('SuperAdmin', 'TransactionAdmin'), getAnalytics);
router.get('/audit', protect, authorize('SuperAdmin', 'TransactionAdmin'), getAuditLogs);
router.get('/orders/search', protect, searchOrders);
router.patch('/change-password', protect, changePassword);
router.get('/menus', protect, authorize('MenuManager', 'SuperAdmin'), getAllMenuItems);
router.patch('/menus/:menuId/toggle', protect, authorize('MenuManager'), toggleMenuAvailability);

// Order routes
router.get('/orders', protect, getAllOrders);
router.get('/orders/:orderId', protect, getOrderById);
router.patch('/orders/:orderId/accept', protect,authorize('SuperAdmin', 'MenuManager'), acceptOrder);
router.patch('/orders/:orderId/reject', protect,authorize('SuperAdmin', 'MenuManager'), rejectOrder);
router.patch('/orders/:orderId/status', protect,authorize('SuperAdmin', 'MenuManager'), updateOrderStatus);

export default router;