import jwt from "jsonwebtoken";
import RestaurantUser from "../models/restaurantUserModel.js";

export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }


    if (!token) {
      return res.status(401).json({
        status: false,
        message: "Not authorized, no token",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await RestaurantUser.findById(decoded.id)
      .select("-password")
      .populate('restaurantId', 'name subdomain isActive');

    if (!user || !user.isActive) {
      return res.status(401).json({
        status: false,
        message: "Not authorized, user not found",
      });
    }

    // Check if user's restaurant is active
    if (!user.restaurantId || !user.restaurantId.isActive) {
      return res.status(401).json({
        status: false,
        message: "Restaurant is inactive",
      });
    }

    // Ensure all required fields exist
    req.user = {
      _id: user._id,
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'SubUser',
      isActive: user.isActive !== undefined ? user.isActive : true,
      stars: user.stars || 0,
      isFirstLogin: user.isFirstLogin || false,
      restaurantId: user.restaurantId._id,
      restaurant: user.restaurantId
    };

    // Set tenant context if not already set
    if (!req.restaurantId) {
      req.restaurantId = user.restaurantId._id;
      req.restaurant = user.restaurantId;
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

export const authenticateToken = protect;

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

export const requirePasswordChange = (req, res, next) => {
  if (req.user && req.user.isFirstLogin) {
    return res.status(403).json({
      status: false,
      message: "Password change required",
      requirePasswordChange: true
    });
  }
  next();
};