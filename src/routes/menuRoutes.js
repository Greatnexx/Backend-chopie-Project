import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createMenu, getMenus, getMenusByCategory, updateMenu, getAllMenusForManagement, toggleMenuAvailability, getMenusByTable, getMenusByCategoryAndTable } from "../Controllers/menu.js";
import { uploadMenu } from "../middlewares/menuUpload.js";

const router = express.Router();

router.post("/menu", uploadMenu.single("image"), createMenu);

router.get("/menus/:categoryId", getMenusByCategory);
router.get("/menus", getMenus);
router.get("/management/menus", getAllMenusForManagement); // For restaurant staff to see all items
router.patch("/menu/:id", uploadMenu.single('image'), updateMenu);
router.patch("/menu/:id/toggle-availability", toggleMenuAvailability); // Toggle availability
router.get("/menus/table/:tableNumber", getMenusByTable); // Get menus by table (VIP/Regular)
router.get("/menus/:categoryId/table/:tableNumber", getMenusByCategoryAndTable); // Get menus by category and table

export default router;

