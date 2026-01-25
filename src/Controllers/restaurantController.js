import Restaurant from "../models/restaurantModel.js";
import RestaurantUser from "../models/restaurantUserModel.js";
import { generateToken } from "../utils/generateToken.js";

// Restaurant Registration (Public)
export const registerRestaurant = async (req, res) => {
  try {
    const { name, email, phone, address, subdomain, ownerName } = req.body;

    // Check if restaurant already exists
    const existingRestaurant = await Restaurant.findOne({
      $or: [{ email }, { subdomain }]
    });

    if (existingRestaurant) {
      return res.status(400).json({
        status: false,
        message: "Restaurant with this email or subdomain already exists",
      });
    }

    // Create restaurant
    const restaurant = await Restaurant.create({
      name,
      email,
      phone,
      address,
      subdomain: subdomain.toLowerCase(),
    });

    // Create default super admin user
    const adminUser = await RestaurantUser.create({
      restaurantId: restaurant._id,
      name: ownerName,
      email: email, // Use the restaurant email for the admin user
      password: "ADMIN123", // Default password
      role: "SuperAdmin",
      isFirstLogin: true,
    });

    const token = generateToken(adminUser._id);

    res.status(201).json({
      status: true,
      message: "Restaurant registered successfully",
      data: {
        restaurant: {
          _id: restaurant._id,
          name: restaurant.name,
          subdomain: restaurant.subdomain,
        },
        user: {
          _id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          isFirstLogin: adminUser.isFirstLogin,
          token,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Restaurant registration failed",
      error: error.message,
    });
  }
};

// Get Restaurant Details
export const getRestaurantDetails = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.user.restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: "Restaurant not found",
      });
    }

    res.json({
      status: true,
      data: restaurant,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// Update Restaurant Branding
export const updateRestaurantBranding = async (req, res) => {
  try {
    const { primaryColor, secondaryColor, accentColor, fontFamily } = req.body;

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.user.restaurantId,
      {
        $set: {
          "branding.primaryColor": primaryColor,
          "branding.secondaryColor": secondaryColor,
          "branding.accentColor": accentColor,
          "branding.fontFamily": fontFamily,
        },
      },
      { new: true }
    );

    res.json({
      status: true,
      message: "Branding updated successfully",
      data: restaurant.branding,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// Upload Restaurant Logo
export const uploadRestaurantLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: "No logo file provided",
      });
    }

    const logoPath = `/uploads/logos/${req.file.filename}`;

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.user.restaurantId,
      { $set: { "branding.logo": logoPath } },
      { new: true }
    );

    res.json({
      status: true,
      message: "Logo uploaded successfully",
      data: { logo: restaurant.branding.logo },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// Get Restaurant by Subdomain (Public)
export const getRestaurantBySubdomain = async (req, res) => {
  try {
    const { subdomain } = req.params;

    const restaurant = await Restaurant.findOne({ 
      subdomain: subdomain.toLowerCase(),
      isActive: true 
    });

    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: "Restaurant not found",
      });
    }

    res.json({
      status: true,
      data: {
        _id: restaurant._id,
        name: restaurant.name,
        branding: restaurant.branding,
        settings: restaurant.settings,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};