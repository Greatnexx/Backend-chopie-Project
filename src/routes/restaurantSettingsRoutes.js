import express from 'express';
import { authenticateToken } from '../middlewares/restaurantAuth.js';
import { tenantMiddleware, requireTenant } from '../middlewares/tenantMiddleware.js';
import { getRestaurantPublicInfo } from '../Controllers/restaurantSettingsController.js';
import Restaurant from '../models/restaurantModel.js';

const router = express.Router();

// Public endpoint - no auth required
router.get('/public/:subdomain', getRestaurantPublicInfo);

// Get restaurant settings
router.get('/settings', authenticateToken, tenantMiddleware, requireTenant, async (req, res) => {
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
      data: {
        settings: restaurant.settings,
        operatingHours: restaurant.operatingHours,
        contactInfo: restaurant.contactInfo,
        deliverySettings: restaurant.deliverySettings
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
});

// Update restaurant settings
router.put('/settings', authenticateToken, tenantMiddleware, requireTenant, async (req, res) => {
  try {
    const { settings, operatingHours, contactInfo, deliverySettings } = req.body;

    const updateData = {};
    if (settings) updateData.settings = settings;
    if (operatingHours) {
      updateData.operatingHours = operatingHours;
    }
    if (contactInfo) updateData.contactInfo = contactInfo;
    if (deliverySettings) updateData.deliverySettings = deliverySettings;

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
      message: 'Settings updated successfully',
      data: {
        settings: restaurant.settings,
        operatingHours: restaurant.operatingHours,
        contactInfo: restaurant.contactInfo,
        deliverySettings: restaurant.deliverySettings
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
});

export default router;