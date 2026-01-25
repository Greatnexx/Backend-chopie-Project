import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { protect as restaurantProtect } from "../middlewares/restaurantAuth.js";
import { createMenu, getMenus, getMenusByCategory, updateMenu, deleteMenu, getAllMenusForManagement, toggleMenuAvailability, getMenusByTable, getMenusByCategoryAndTable, searchMenus, deleteMenusByCategory } from "../Controllers/menu.js";
import { uploadMenu } from "../middlewares/menuUpload.js";
import { tenantMiddleware } from "../middlewares/tenantMiddleware.js";

const router = express.Router();

// Restaurant staff routes (require restaurant authentication)
router.post("/menu", restaurantProtect, tenantMiddleware, uploadMenu.single("image"), createMenu);
router.patch("/menu/:id", restaurantProtect, tenantMiddleware, uploadMenu.single('image'), updateMenu);
router.patch("/menu/:id/toggle-availability", restaurantProtect, tenantMiddleware, toggleMenuAvailability);
router.delete("/menu/:id", restaurantProtect, tenantMiddleware, deleteMenu);
router.delete("/menus/category/:categoryId", restaurantProtect, tenantMiddleware, deleteMenusByCategory);
router.get("/management/menus", restaurantProtect, tenantMiddleware, getAllMenusForManagement);

// Public routes (for customers)
router.get("/menus/search", searchMenus);
router.get("/menus/:categoryId", getMenusByCategory);
router.get("/menus", getMenus);
router.get("/menus/table/:tableNumber", getMenusByTable);
router.get("/menus/:categoryId/table/:tableNumber", getMenusByCategoryAndTable);

export default router;

