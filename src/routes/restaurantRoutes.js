import express from 'express';
import { loginRestaurantUser, createRestaurantUser, getAllUsers, toggleUserStatus, awardStar, getAnalytics, getAuditLogs, searchOrders, changePassword, firstTimePasswordChange, getUserCredentials, resetUserPassword, toggleMenuAvailability, getAllMenuItems, deleteUser, forgotPassword, resetPassword } from '../Controllers/restaurantAuth.js';
import { registerRestaurant } from '../Controllers/tenantController.js';
import { acceptOrder, rejectOrder, updateOrderStatus, getAllOrders, getOrderById, updatePaymentStatus } from '../Controllers/order.js';
import { createCategory, getCategories } from '../Controllers/category.js';
import { protect, authorize, requirePasswordChange } from '../middlewares/restaurantAuth.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';

const router = express.Router();

// Auth routes
router.post('/register', registerRestaurant);
router.post('/login', loginRestaurantUser);
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);
router.post('/users', protect, tenantMiddleware, authorize('SuperAdmin'), createRestaurantUser);
router.get('/users', protect, tenantMiddleware, authorize('SuperAdmin'), getAllUsers);
router.patch('/users/:userId/status', protect, tenantMiddleware, authorize('SuperAdmin'), toggleUserStatus);
router.patch('/users/:userId/star', protect, tenantMiddleware, authorize('SuperAdmin', 'TransactionAdmin'), awardStar);
router.delete('/users/:userId', protect, tenantMiddleware, authorize('SuperAdmin'), deleteUser);
router.get('/analytics', protect, tenantMiddleware, requirePasswordChange, authorize('SuperAdmin', 'TransactionAdmin'), getAnalytics);
router.get('/audit', protect, tenantMiddleware, requirePasswordChange, authorize('SuperAdmin', 'TransactionAdmin'), getAuditLogs);
router.get('/orders/search', protect, tenantMiddleware, requirePasswordChange, searchOrders);
router.patch('/change-password', protect, changePassword);
router.patch('/first-time-password', protect, firstTimePasswordChange);
router.get('/users/:userId/credentials', protect, tenantMiddleware, authorize('SuperAdmin'), getUserCredentials);
router.patch('/users/:userId/reset-password', protect, tenantMiddleware, authorize('SuperAdmin'), resetUserPassword);
router.get('/menus', protect, tenantMiddleware, requirePasswordChange, authorize('MenuManager', 'SuperAdmin'), getAllMenuItems);
router.patch('/menus/:menuId/toggle', protect, tenantMiddleware, requirePasswordChange, authorize('MenuManager', 'SuperAdmin'), toggleMenuAvailability);

// Category routes
router.post('/categories', protect, tenantMiddleware, requirePasswordChange, authorize('MenuManager', 'SuperAdmin'), createCategory);
router.get('/categories', protect, tenantMiddleware, requirePasswordChange, authorize('MenuManager', 'SuperAdmin'), getCategories);

// Order routes
router.get('/orders', protect, tenantMiddleware, requirePasswordChange, getAllOrders);
router.get('/orders/:orderId', protect, tenantMiddleware, requirePasswordChange, getOrderById);
router.patch('/orders/:orderId/accept', protect, tenantMiddleware, requirePasswordChange, authorize('SuperAdmin', 'MenuManager'), acceptOrder);
router.patch('/orders/:orderId/reject', protect, tenantMiddleware, requirePasswordChange, authorize('SuperAdmin', 'MenuManager'), rejectOrder);
router.patch('/orders/:orderId/status', protect, tenantMiddleware, requirePasswordChange, authorize('SuperAdmin', 'MenuManager'), updateOrderStatus);
router.patch('/orders/:orderId/payment', protect, tenantMiddleware, requirePasswordChange, authorize('SuperAdmin', 'MenuManager', 'TransactionAdmin'), updatePaymentStatus);

export default router;