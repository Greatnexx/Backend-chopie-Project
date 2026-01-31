import Restaurant from "../models/restaurantModel.js";

export const updateBranding = async (req, res) => {
  try {
    const { restaurantId } = req.user;
    const { name, primaryColor, secondaryColor, accentColor, fontFamily } = req.body;
    
    console.log('Update branding request:', {
      restaurantId,
      body: req.body,
      hasFile: !!req.file,
      file: req.file ? { path: req.file.path, filename: req.file.filename } : null
    });
    
    const updateData = {
      "branding.name": name,
      "branding.primaryColor": primaryColor,
      "branding.secondaryColor": secondaryColor,
      "branding.accentColor": accentColor,
      "branding.fontFamily": fontFamily,
    };
    
    if (req.file) {
      updateData["branding.logo"] = req.file.path;
      console.log('Logo upload successful, path:', req.file.path);
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      console.log('Restaurant not found for ID:', restaurantId);
      return res.status(404).json({ message: "Restaurant not found" });
    }

    console.log('Branding updated successfully:', restaurant.branding);
    
    res.json({
      status: true,
      message: "Branding updated successfully",
      data: {
        branding: restaurant.branding
      }
    });
  } catch (error) {
    console.error('Branding update error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getBranding = async (req, res) => {
  try {
    const { restaurantId } = req.user;
    
    const restaurant = await Restaurant.findById(restaurantId).select('branding name address');
    
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.json({
      status: true,
      data: {
        branding: restaurant.branding,
        name: restaurant.name,
        address: restaurant.address
      }
    });
  } catch (error) {
    console.error('Get branding error:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};