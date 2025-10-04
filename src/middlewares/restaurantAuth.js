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
    req.user = await RestaurantUser.findById(decoded.id).select("-password");

    console.log('Decoded user:', req.user?.email, 'Active:', req.user?.isActive);

    if (!req.user || !req.user.isActive) {
      return res.status(401).json({
        status: false,
        message: "Not authorized, user not found",
      });
    }

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
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: false,
        message: "Access denied",
      });
    }
    next();
  };
};