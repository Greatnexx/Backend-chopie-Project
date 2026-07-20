import Restaurant from "../models/restaurantModel.js";
import RestaurantUser from "../models/restaurantUserModel.js";
import jwt from "jsonwebtoken";
import { EMAIL_TEMPLATES, sendTemplateEmail } from "../utils/email.js";

// Restaurant registration/onboarding
export const registerRestaurant = async (req, res) => {
  try {
    const { name, email, phone, address, ownerName, password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        status: false,
        message: "Password must be at least 6 characters"
      });
    }

    // Check if email already registered
    const existingEmail = await Restaurant.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        status: false,
        message: "Email already registered"
      });
    }

    // Auto-generate unique subdomain from restaurant name
    const baseSubdomain = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    let subdomain = baseSubdomain;
    let counter = 1;
    while (await Restaurant.findOne({ subdomain })) {
      subdomain = `${baseSubdomain}${counter}`;
      counter++;
    }

    // Clean up any existing restaurant users with this email
    // await RestaurantUser.deleteMany({ email });

    // Create restaurant
    const restaurant = await Restaurant.create({
      name,
      email,
      phone,
      address,
      subdomain: subdomain.toLowerCase(),
      isActive: true
    });

    // Create default admin user
    const admin = await RestaurantUser.create({
      restaurantId: restaurant._id,
      name: ownerName || name,
      email: email,
      password: password,
      role: "SuperAdmin",
      isFirstLogin: false
    });

    sendTemplateEmail(
      { email: restaurant.email, name: restaurant.name },
      EMAIL_TEMPLATES.PENDING_REVIEW,
      {
        Resturant_Name: restaurant.name,
        Email: restaurant.email,
        Owner_Name: ownerName || name,
      }
    );

    res.status(201).json({
      status: true,
      message: "Restaurant registered successfully!",
      data: {
        restaurant: {
          id: restaurant._id,
          name: restaurant.name,
          subdomain: restaurant.subdomain
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