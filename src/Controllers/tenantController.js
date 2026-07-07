import Restaurant from "../models/restaurantModel.js";
import RestaurantUser from "../models/restaurantUserModel.js";
import jwt from "jsonwebtoken";

// Restaurant registration/onboarding
export const registerRestaurant = async (req, res) => {
  try {
    const { name, email, phone, address, subdomain, ownerName, password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        status: false,
        message: "Password must be at least 6 characters"
      });
    }

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

    // Clean up any existing restaurant users with this email
    await RestaurantUser.deleteMany({ email });

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

    // Send data to Airtable for email automation
    try {
      const airtableData = {
        "Restaurant Name": restaurant.name,
        "Email": restaurant.email,
        "Phone": restaurant.phone || '',
        "Address": restaurant.address || '',
        "Subdomain": restaurant.subdomain,
        "Menu URL": `${process.env.PROD_FRONTEND_URL}/menu/${restaurant.subdomain}`,
        "Dashboard URL": `${process.env.PROD_FRONTEND_URL}/restaurant/login`
      };
      

      const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Restaurants`;
      
      const response = await fetch(airtableUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [{ fields: airtableData }]
        })
      });
      
      const responseData = await response.json();
     
      
      if (response.ok) {
        console.log('✅ Restaurant data sent to Airtable successfully');
      } else {
        console.error('❌ Airtable API error:', responseData);
      }
    } catch (airtableError) {
      console.error('Failed to send to Airtable:', airtableError.message);
      console.error('Full error:', airtableError);
    }

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