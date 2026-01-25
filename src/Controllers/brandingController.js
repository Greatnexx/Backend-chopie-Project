import Restaurant from "../models/restaurantModel.js";

export const updateBranding = async (req, res) => {
  try {
    const { restaurantId } = req.user;
    const { name, logo, primaryColor, secondaryColor, accentColor, fontFamily } = req.body;

    const restaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      {
        $set: {
          "branding.name": name,
          "branding.logo": logo,
          "branding.primaryColor": primaryColor,
          "branding.secondaryColor": secondaryColor,
          "branding.accentColor": accentColor,
          "branding.fontFamily": fontFamily,
        }
      },
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.json({
      message: "Branding updated successfully",
      branding: restaurant.branding
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getBranding = async (req, res) => {
  try {
    const { restaurantId } = req.user;
    
    const restaurant = await Restaurant.findById(restaurantId).select('branding name');
    
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.json({
      branding: restaurant.branding,
      restaurantName: restaurant.name
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};