import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createMenu, getMenus, getMenusByCategory, updateMenu, getAllMenusForManagement, toggleMenuAvailability } from "../Controllers/menu.js";

const router = express.Router();

router.post("/menu",  createMenu);
router.get("/menus/:categoryId", getMenusByCategory);
router.get("/menus", getMenus);
router.get("/management/menus", getAllMenusForManagement); // For restaurant staff to see all items
router.patch("/menu/:id", updateMenu);
router.patch("/menu/:id/toggle-availability", toggleMenuAvailability); // Toggle availability



export default router;

