import jwt from "jsonwebtoken";
import RestaurantUser from "../models/restaurantUserModel.js";

export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    console.log('Auth header:', req.headers.authorization);
    console.log('Token:', token ? 'Present' : 'Missing');

    if (!token) {
      return res.status(401).json({
        status: false,
        message: "Not authorized, no token",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await RestaurantUser.findById(decoded.id).select("-password");

    if (!user || !user.isActive) {
      return res.status(401).json({
        status: false,
        message: "Not authorized, user not found",
      });
    }

    // Ensure all required fields exist
    req.user = {
      _id: user._id,
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'SubUser',
      isActive: user.isActive !== undefined ? user.isActive : true,
      stars: user.stars || 0
    };

    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({
      status: false,
      message: "Not authorized, token failed",
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: false,
        message: "Access denied",
      });
    }
    next();
  };
};