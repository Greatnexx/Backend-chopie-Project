import jwt from "jsonwebtoken";
import PlatformOwner from "../models/platformOwnerModel.js";

export const protectPlatformOwner = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        status: false,
        message: "Access Denied - Platform Owner access required.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const owner = await PlatformOwner.findById(decoded.id).select("-password");

    if (!owner || !owner.isActive || owner.role !== 'PlatformOwner') {
      return res.status(401).json({
        status: false,
        message: "Access Denied - Platform Owner access required.",
      });
    }

    req.user = owner;
    next();
  } catch (error) {
    console.error('Platform Owner Auth error:', error.message);
    res.status(401).json({
      status: false,
      message: "Access Denied - Platform Owner access required.",
    });
  }
};