import express from "express"
import { createUser, loginUser } from "../Controllers/user.js";

const router = express.Router();

router.post("/reg",createUser);
router.post("/auth",loginUser);


export default router