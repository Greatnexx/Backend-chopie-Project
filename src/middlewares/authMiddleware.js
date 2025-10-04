import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';


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





export { protect };