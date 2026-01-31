import Menu from "../models/menuModel.js";
import Category from "../models/categoryModel.js";
import cloudinary from '../config/cloudinary.js';

// Utility function to determine menu type from table number
const getMenuTypeFromTable = (tableNumber) => {
  if (!tableNumber) return 'REGULAR';
  if (tableNumber.toString().toUpperCase().startsWith('VIP')) return 'VIP';
  return 'REGULAR';
};

// Create a new menu
export const createMenu = async (req, res) => {
  try {
    const { name, description, price, available, category, menuTypes } = req.body;

    // Parse menuTypes if it's a string (from FormData)
    let parsedMenuTypes = menuTypes;
    if (typeof menuTypes === 'string') {
      try {
        parsedMenuTypes = JSON.parse(menuTypes);
      } catch (error) {
        console.error('Error parsing menuTypes:', error);
        parsedMenuTypes = null;
      }
    }
    // Get restaurantId from tenant middleware or authenticated user
    let restaurantId = req.restaurantId;
    if (!restaurantId && req.user && req.user.restaurantId) {
      restaurantId = req.user.restaurantId;
    }

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Restaurant context required",
      });
    }

    // Validate category exists and belongs to restaurant
    const categoryQuery = { _id: category };
    if (restaurantId) {
      categoryQuery.restaurantId = restaurantId;
    }
    
    const categoryExists = await Category.findOne(categoryQuery);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Category does not exist",
      });
    }

    let imagePath = null;
    if (req.file) {
      imagePath = req.file.path; // Cloudinary URL
    }

    const menuData = {
      restaurantId: restaurantId,
      name,
      description,
      price,
      image: imagePath,
      available,
      category,
    };

    // Add menuTypes if provided
    if (parsedMenuTypes) {
      menuData.menuTypes = parsedMenuTypes;
    }

    const menu = new Menu(menuData);
    await menu.save();
    await menu.populate("category");

    res.status(201).json({
      success: true,
      message: "Menu created successfully",
      data: menu,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating menu",
      error: error.message,
    });
  }
};

// Get all menus
export const getMenus = async (req, res) => {
  try {
    const {
      category,
      available,
      page = 1,
      limit = 10,
      sort = "name",
    } = req.query;

    const filter = {};
    if (req.restaurantId) {
      filter.restaurantId = req.restaurantId;
    }
    
    if (category) filter.category = category;
    if (available !== undefined) {
      filter.available = available === "true";
    } else {
      filter.available = true;
    }

    // Build sort object
    let sortObject = {};
    if (sort === "price") sortObject.price = 1;
    else if (sort === "-price") sortObject.price = -1;
    else if (sort === "name") sortObject.name = 1;
    else if (sort === "-name") sortObject.name = -1;
    else if (sort === "createdAt") sortObject.createdAt = -1;
    else sortObject.name = 1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    const menus = await Menu.find(filter)
      .populate("category")
      .sort(sortObject)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Menu.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: menus,
      count: menus.length,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching menus",
      error: error.message,
    });
  }
};

// Get single menu by ID
export const getMenuById = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }

    const menu = await Menu.findOne(query).populate("category");

    if (!menu) {
      return res.status(404).json({
        status: false,
        message: "Menu not found",
      });
    }

    res.status(200).json({
      status: true,
      data: menu,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching menu",
      error: error.message,
    });
  }
};

// Update menu
export const updateMenu = async (req, res) => {
  try {
    const { name, description, price, available, category } = req.body;
    let { menuTypes } = req.body;
    const {id} = req.params;

    // Parse menuTypes if it's a string (from FormData)
    let parsedMenuTypes = menuTypes;
    if (typeof menuTypes === 'string') {
      try {
        parsedMenuTypes = JSON.parse(menuTypes);
      } catch (error) {
        console.error('Error parsing menuTypes:', error);
        parsedMenuTypes = null;
      }
    }
    
    // Create an object with only the fields that are defined
    const updates = {};
    const allowedFields = ["name", "description", "price", "available", "category"];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle menuTypes separately
    if (parsedMenuTypes !== undefined) {
      updates.menuTypes = parsedMenuTypes;
    }

    // Handle image upload if new file is provided
    if (req.file) {
      updates.image = req.file.path; // Cloudinary URL
    }

    const query = { _id: id };
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }

    const menu = await Menu.findOneAndUpdate(
      query,
      updates,
      { new: true, runValidators: true }
    ).populate("category");

    if (!menu) {
      return res.status(404).json({
        status: false,
        message: "Menu not found",
      });
    }
    res.status(200).json({
      status: true,
      message: "Menu updated successfully",
      data: menu,
    });
  } catch (error) {
    console.error('Error updating menu:', error);
    res.status(500).json({
      status: false,
      message: "Error updating menu",
      error: error.message,
    });
  }
};

// Delete menu
export const deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: id };
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }

    const menu = await Menu.findOne(query);

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    // Delete image from Cloudinary if exists
    if (menu.image) {
      try {
        // Extract public_id from Cloudinary URL
        const publicId = menu.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`chopie/menu-images/${publicId}`);
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
      }
    }

    await Menu.findOneAndDelete(query);

    res.status(200).json({
      success: true,
      message: "Menu deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting menu",
      error: error.message,
    });
  }
};

export const toggleMenuAvailability = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    menu.available = !menu.available;
    await menu.save();

    await menu.populate("category");

    res.status(200).json({
      success: true,
      message: `Menu ${menu.available ? "enabled" : "disabled"} successfully`,
      data: menu,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error toggling menu availability",
      error: error.message,
    });
  }
};

// Get menus by category
export const getMenusByCategory = async (req, res) => {
  try {
    // const user_id = req.user._id;
    const { categoryId } = req.params;
    const { available, page = 1, limit = 10 } = req.query;

    // Validate categoryId
    if (!categoryId || categoryId === 'undefined' || categoryId === 'null') {
      return res.status(400).json({
        status: false,
        message: "Valid category ID is required",
      });
    }

    // Validate category exists and belongs to restaurant
    const categoryQuery = { _id: categoryId };
    if (req.restaurantId) {
      categoryQuery.restaurantId = req.restaurantId;
    }
    
    const category = await Category.findOne(categoryQuery);
    if (!category) {
      return res.status(404).json({
        status: false,
        message: "Category not found",
      });
    }

    // Build filter - only show available items by default for customers
    const filter = { category: categoryId };
    if (req.restaurantId) {
      filter.restaurantId = req.restaurantId;
    }
    
    if (available !== undefined) {
      filter.available = available === "true";
    } else {
      // Default to only available items for customer-facing requests
      filter.available = true;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    const menus = await Menu.find(filter)
      .populate("category")
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Menu.countDocuments(filter);

    res.status(200).json({
      status: true,
      data:{
        menus,
        pagination:{
          count: menus.length,
          total,
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),

        }

      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching menus by category",
      error: error.message,
    });
  }
};

// Get all menus for restaurant management (including unavailable items)
export const getAllMenusForManagement = async (req, res) => {
  try {
    const {
      category,
      available,
      page = 1,
      limit = 10,
      sort = "name",
    } = req.query;

    const filter = {};
    if (req.restaurantId) {
      filter.restaurantId = req.restaurantId;
    }
    
    if (category) filter.category = category;
    if (available !== undefined) filter.available = available === "true";

    // Build sort object
    let sortObject = {};
    if (sort === "price") sortObject.price = 1;
    else if (sort === "-price") sortObject.price = -1;
    else if (sort === "name") sortObject.name = 1;
    else if (sort === "-name") sortObject.name = -1;
    else if (sort === "createdAt") sortObject.createdAt = -1;
    else sortObject.name = 1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    const menus = await Menu.find(filter)
      .populate("category")
      .sort(sortObject)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Menu.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: menus,
      count: menus.length,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching menus for management",
      error: error.message,
    });
  }
};

// Get menus by table (VIP or Regular based on table number)
export const getMenusByTable = async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!tableNumber) {
      return res.status(400).json({
        success: false,
        message: "Table number is required",
      });
    }

    const menuType = getMenuTypeFromTable(tableNumber);
    
    // Get all available menus and filter by menu type and restaurant
    const filter = { available: true };
    if (req.restaurantId) {
      filter.restaurantId = req.restaurantId;
    }
    
    const menus = await Menu.find(filter)
      .populate("category")
      .sort({ name: 1 });

    // Filter and transform menus based on menu type
    const filteredMenus = menus
      .filter(menu => {
        // Check if item is available for this menu type
        if (menu.menuTypes && menu.menuTypes[menuType]) {
          return menu.menuTypes[menuType].available;
        }
        // Fallback to regular price if menuTypes not set
        return menuType === 'REGULAR';
      })
      .map(menu => {
        // Transform menu to show correct price for menu type
        const menuObj = menu.toObject();
        if (menu.menuTypes && menu.menuTypes[menuType] && menu.menuTypes[menuType].price) {
          menuObj.price = menu.menuTypes[menuType].price;
        } else if (menu.price) {
          menuObj.price = menu.price;
        } else {
          menuObj.price = 0;
        }
        menuObj.menuType = menuType;
        return menuObj;
      });

    // Apply pagination
    const skip = (page - 1) * limit;
    const paginatedMenus = filteredMenus.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      data: paginatedMenus,
      menuType,
      tableNumber,
      count: paginatedMenus.length,
      total: filteredMenus.length,
      currentPage: parseInt(page),
      totalPages: Math.ceil(filteredMenus.length / limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching menus by table",
      error: error.message,
    });
  }
};

// Get menus by category and table
export const getMenusByCategoryAndTable = async (req, res) => {
  try {
    const { categoryId, tableNumber } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!categoryId || !tableNumber) {
      return res.status(400).json({
        success: false,
        message: "Category ID and table number are required",
      });
    }

    const menuType = getMenuTypeFromTable(tableNumber);
    
    // Validate category exists and belongs to restaurant
    const categoryQuery = { _id: categoryId };
    if (req.restaurantId) {
      categoryQuery.restaurantId = req.restaurantId;
    }
    
    const category = await Category.findOne(categoryQuery);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Get menus for this category and restaurant
    const filter = { 
      category: categoryId, 
      available: true 
    };
    if (req.restaurantId) {
      filter.restaurantId = req.restaurantId;
    }
    
    const menus = await Menu.find(filter)
      .populate("category")
      .sort({ name: 1 });

    // Filter and transform menus based on menu type
    const filteredMenus = menus
      .filter(menu => {
  
        if (menu.menuTypes && menu.menuTypes[menuType]) {
          return menu.menuTypes[menuType].available;
        }
        return menuType === 'REGULAR';
      })
      .map(menu => {
        const menuObj = menu.toObject();
        if (menu.menuTypes && menu.menuTypes[menuType] && menu.menuTypes[menuType].price) {
          menuObj.price = menu.menuTypes[menuType].price;
        } else if (menu.price) {
          menuObj.price = menu.price;
        } else {
          menuObj.price = 0;
        }
        menuObj.menuType = menuType;
        return menuObj;
      });

    // Apply pagination
    const skip = (page - 1) * limit;
    const paginatedMenus = filteredMenus.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        menus: paginatedMenus,
        pagination: {
          count: paginatedMenus.length,
          total: filteredMenus.length,
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredMenus.length / limit),
        }
      },
      menuType,
      tableNumber,
      category: category.name
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching menus by category and table",
      error: error.message,
    });
  }
};

// Search menus
export const searchMenus = async (req, res) => {
  try {
    const { q, category, available, page = 1, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        status: false,
        message: "Search query is required",
      });
    }

    // Build search filter
    const filter = {
      $or: [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ],
    };

    // Add restaurant filtering
    if (req.restaurantId) {
      filter.restaurantId = req.restaurantId;
    }

    if (category) filter.category = category;
    if (available !== undefined) filter.available = available === "true";

    // Calculate pagination
    const skip = (page - 1) * limit;

    const menus = await Menu.find(filter)
      .populate("category")
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Menu.countDocuments(filter);

    res.status(200).json({
      status: true,
      count: menus.length,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: menus,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error searching menus",
      error: error.message,
    });
  }
};

// Delete all menus for a category
export const deleteMenusByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    const query = { category: categoryId };
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }

    // Get menus to delete their images
    const menusToDelete = await Menu.find(query);
    
    if (menusToDelete.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No menus found in this category",
      });
    }

    // Delete images from Cloudinary
    for (const menu of menusToDelete) {
      if (menu.image) {
        try {
          const publicId = menu.image.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`chopie/menu-images/${publicId}`);
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error);
        }
      }
    }

    // Delete menus from database
    const result = await Menu.deleteMany(query);

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} menus deleted from category successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting menus by category",
      error: error.message,
    });
  }
};