import Restaurant from "../models/restaurantModel.js";
import RestaurantUser from "../models/restaurantUserModel.js";
import jwt from "jsonwebtoken";

// Restaurant registration/onboarding
export const registerRestaurant = async (req, res) => {
  try {
    const { name, email, phone, address, subdomain } = req.body;

    // Check if subdomain is available
    const existingRestaurant = await Restaurant.findOne({ 
      $or: [{ email }, { subdomain: subdomain.toLowerCase() }] 
    });
    
    if (existingRestaurant) {
      return res.status(400).json({
        status: false,
        message: existingRestaurant.email === email ? "Email already registered" : "Subdomain not available"
      });
    }

    // Create restaurant
    const restaurant = await Restaurant.create({
      name,
      email,
      phone,
      address,
      subdomain: subdomain.toLowerCase(),
      isActive: true // Auto-approve for now
    });

    // Create default admin user using restaurant name for password
    const defaultPassword = name.split(' ').pop().toUpperCase();
    const admin = await RestaurantUser.create({
      restaurantId: restaurant._id,
      name: "Restaurant Admin",
      email: email,
      password: defaultPassword,
      role: "SuperAdmin",
      isFirstLogin: true
    });

    res.status(201).json({
      status: true,
      message: "Restaurant registered successfully!",
      data: {
        restaurant: {
          id: restaurant._id,
          name: restaurant.name,
          subdomain: restaurant.subdomain
        },
        loginCredentials: {
          email: email,
          password: defaultPassword
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Registration failed",
      error: error.message
    });
  }
};

// Get restaurant by subdomain
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
        message: "Restaurant not found"
      });
    }

    res.json({
      status: true,
      data: {
        id: restaurant._id,
        name: restaurant.name,
        branding: restaurant.branding,
        settings: restaurant.settings
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

// Update restaurant branding
export const updateBranding = async (req, res) => {
  try {
    const { primaryColor, secondaryColor, accentColor, fontFamily } = req.body;
    
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.restaurantId,
      {
        $set: {
          "branding.primaryColor": primaryColor,
          "branding.secondaryColor": secondaryColor,
          "branding.accentColor": accentColor,
          "branding.fontFamily": fontFamily
        }
      },
      { new: true }
    );

    res.json({
      status: true,
      message: "Branding updated successfully",
      data: restaurant.branding
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

// Upload restaurant logo
export const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: "No logo file provided"
      });
    }

    const logoPath = `/uploads/logos/${req.file.filename}`;
    
    await Restaurant.findByIdAndUpdate(
      req.restaurantId,
      { $set: { "branding.logo": logoPath } }
    );

    res.json({
      status: true,
      message: "Logo uploaded successfully",
      data: { logoPath }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

// Get all restaurants (Super Admin)
export const getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({})
      .select("-__v")
      .sort({ createdAt: -1 });

    res.json({
      status: true,
      data: restaurants
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

// Approve/reject restaurant
export const updateRestaurantStatus = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { isActive } = req.body;

    const restaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      { isActive },
      { new: true }
    );

    res.json({
      status: true,
      message: `Restaurant ${isActive ? 'approved' : 'suspended'} successfully`,
      data: restaurant
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message
    });
  }
};