import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createMenu, getMenus, getMenusByCategory, updateMenu } from "../Controllers/menu.js";

const router = express.Router();

router.post("/menu",  createMenu);
router.get("/menus/:categoryId", getMenusByCategory);
router.get("/menus", getMenus);
router.patch("/menu/:id", updateMenu);



export default router;

