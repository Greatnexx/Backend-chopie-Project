import Restaurant from "../models/restaurantModel.js";
import RestaurantUser from "../models/restaurantUserModel.js";
import generateToken from "../utils/generateToken.js";

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
        message: "Restaurant with this email or subdomain already exists"
      });
    }

    // Check if owner email already exists (using restaurant email as owner email)
    const existingUser = await RestaurantUser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: false,
        message: "Email already exists"
      });
    }

    // Create restaurant
    const restaurant = await Restaurant.create({
      name,
      email,
      phone,
      address,
      subdomain: subdomain.toLowerCase()
    });

    // Create owner as SuperAdmin - use restaurant name as owner name if ownerName not provided
    const owner = await RestaurantUser.create({
      restaurantId: restaurant._id,
      name: ownerName || `${name} Admin`, // Use ownerName if provided, otherwise default to restaurant name + Admin
      email: email, // Use restaurant email as owner email
      password: "admin123", // Default password
      role: "SuperAdmin",
      isFirstLogin: true
    });

    const token = generateToken(owner._id);

    res.status(201).json({
      status: true,
      message: "Restaurant registered successfully",
      data: {
        restaurant: {
          _id: restaurant._id,
          name: restaurant.name,
          subdomain: restaurant.subdomain
        },
        owner: {
          _id: owner._id,
          name: owner.name,
          email: owner.email,
          role: owner.role,
          isFirstLogin: owner.isFirstLogin
        },
        token,
        temporaryPassword: "admin123"
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

export const getRestaurantBySubdomain = async (req, res) => {
  try {
    const { subdomain } = req.params;
    
    const restaurant = await Restaurant.findOne({ 
      subdomain: subdomain.toLowerCase(),
      isActive: true,
      isApproved: true
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
        _id: restaurant._id,
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