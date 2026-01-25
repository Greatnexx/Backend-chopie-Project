import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import RestaurantUser from '../models/restaurantUserModel.js';

const protect = async (req, res, next) => {
    let token;

    // Check if the Authorization header exists and starts with 'Bearer'
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Extract the token from the Authorization header
            token = req.headers.authorization.split(' ')[1];

           
            // Verify the token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attach the user to the request object
            req.user = await User.findById(decoded.id).select('-password');

            // Proceed to the next middleware or route handler
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({
                status: false,
                message: 'Not authorized, token failed',
                data: null,
            });
        }
    }

    if (!token) {
        res.status(401).json({
            status: false,
            message: 'Not authorized, no token', 
            data: null,
        });
    }
};

const authenticateToken = async (req, res, next) => {
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
        const user = await RestaurantUser.findById(decoded.id).select("-password");

        if (!user || !user.isActive) {
            return res.status(401).json({
                status: false,
                message: "Not authorized, user not found",
            });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({
            status: false,
            message: "Not authorized, token failed",
        });
    }
};

export { protect, authenticateToken };