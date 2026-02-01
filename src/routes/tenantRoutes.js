import express from 'express';
import multer from 'multer';
import path from 'path';
import Restaurant from '../models/restaurantModel.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { registerRestaurant } from '../Controllers/tenantController.js';



const router = express.Router();

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/logos/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Register new restaurant tenant
router.post('/register', registerRestaurant);

// Resolve tenant by subdomain or identifier
router.get('/resolve/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    const restaurant = await Restaurant.findOne({ 
      subdomain: identifier.toLowerCase(),
      isActive: true 
    });

    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: 'Restaurant not found'
      });
    }

    res.json({
      status: true,
      data: restaurant
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to resolve tenant',
      error: error.message
    });
  }
});

// Get tenant branding
router.get('/branding', authenticateToken, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurantId);
    
    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: 'Restaurant not found'
      });
    }

    res.json({
      status: true,
      data: restaurant.branding
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch branding',
      error: error.message
    });
  }
});

// Update tenant branding
router.put('/branding', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    const { primaryColor, secondaryColor, accentColor, fontFamily } = req.body;
    
    const updateData = {
      'branding.primaryColor': primaryColor,
      'branding.secondaryColor': secondaryColor,
      'branding.accentColor': accentColor,
      'branding.fontFamily': fontFamily
    };

    // If logo was uploaded, add it to update data
    if (req.file) {
      updateData['branding.logo'] = `/uploads/logos/${req.file.filename}`;
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.restaurantId,
      { $set: updateData },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: 'Restaurant not found'
      });
    }

    res.json({
      status: true,
      message: 'Branding updated successfully',
      data: restaurant.branding
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to update branding',
      error: error.message
    });
  }
});

// Get tenant-specific categories
router.get('/:subdomain/categories', async (req, res) => {
  try {
    const { subdomain } = req.params;
    
    const restaurant = await Restaurant.findOne({ 
      subdomain: subdomain.toLowerCase(),
      isActive: true 
    });

    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: 'Restaurant not found'
      });
    }

    // Import Category model dynamically to avoid circular dependencies
    const Category = (await import('../models/categoryModel.js')).default;
    const categories = await Category.find({ restaurantId: restaurant._id });

    res.json({
      status: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

// Get tenant-specific menu
router.get('/:subdomain/menu', async (req, res) => {
  try {
    const { subdomain } = req.params;
    
    const restaurant = await Restaurant.findOne({ 
      subdomain: subdomain.toLowerCase(),
      isActive: true 
    });

    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: 'Restaurant not found'
      });
    }

    // Import Menu model dynamically
    const Menu = (await import('../models/menuModel.js')).default;
    const menuItems = await Menu.find({ 
      restaurantId: restaurant._id,
      available: true 
    }).populate('category', 'name');

    res.json({
      status: true,
      data: menuItems
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch menu',
      error: error.message
    });
  }
});

// Admin: Get all restaurants for approval
router.get('/admin/restaurants', authenticateToken, async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({
        status: false,
        message: 'Access denied'
      });
    }

    const restaurants = await Restaurant.find({})
      .sort({ createdAt: -1 });

    res.json({
      status: true,
      data: restaurants
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to fetch restaurants',
      error: error.message
    });
  }
});

// Admin: Approve/reject restaurant
router.put('/admin/restaurants/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Check if user is platform super admin
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({
        status: false,
        message: 'Access denied. Platform admin required.'
      });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: 'Restaurant not found'
      });
    }

    res.json({
      status: true,
      message: `Restaurant ${isActive ? 'approved' : 'rejected'} successfully`,
      data: restaurant
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Failed to update restaurant status',
      error: error.message
    });
  }
});

export default router;