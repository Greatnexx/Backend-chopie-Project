
import Menu from "../models/menuModel.js";
import Category from "../models/categoryModel.js";
import fs from 'fs';

// Utility function to determine menu type from table number
const getMenuTypeFromTable = (tableNumber) => {
  if (!tableNumber) return 'REGULAR';
  if (tableNumber.toString().toUpperCase().startsWith('VIP')) return 'VIP';
  return 'REGULAR';
};

// Create a new menu
export const createMenu = async (req, res) => {
  try {
    
    
    const { name, description, price, available, category } = req.body;
    let { menuTypes } = req.body;

    // Parse menuTypes if it's a string (from FormData)
    if (typeof menuTypes === 'string') {
      try {
        menuTypes = JSON.parse(menuTypes);
      } catch (error) {
        console.error('Error parsing menuTypes:', error);
        menuTypes = null;
      }
    }

    console.log('Creating menu with data:', { name, description, price, available, category, menuTypes });

    // Validate that category exists
    const categoryExists = await Category.findOne({
      _id: category,
    });
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Category does not exist",
      });
    }

    // Handle image upload
    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/menu-images/${req.file.filename}`;
    }

    const menuData = {
      name,
      description,
      price,
      image: imagePath,
      available,
      category,
    };

    // Add menuTypes if provided
    if (menuTypes) {
      menuData.menuTypes = menuTypes;
    }

    const menu = new Menu(menuData);

    await menu.save();
    console.log('Menu saved:', menu);

    // Populate category info in response
    await menu.populate("category");

    res.status(201).json({
      success: true,
      message: "Menu created successfully",
      data: menu,
    });
  } catch (error) {
    console.error('Error creating menu:', error);
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
    // const user_id = req.user._id;
    const {
      category,
      available,
      page = 1,
      limit = 10,
      sort = "name",
    } = req.query;

    // if (!user_id) {
    //   return res.status(401).json({
    //     success: false,
    //     message: "UnAuthorized",
    //   });
    // }

    // Build filter object - only show available items by default for customers
    // const filter = { user: user_id };
    const filter = {};
    if (category) filter.category = category;
    if (available !== undefined) {
      filter.available = available === "true";
    } else {
      // Default to only available items for customer-facing requests
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
    const user_id = req.user._id;

    if (!user_id) {
      return res.status(401).json({
        status: false,
        message: "UnAuthorized",
      });
    }

    const menu = await Menu.findOne({
      _id: req.params.id,
      user: user_id,
    }).populate("category");

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
    if (typeof menuTypes === 'string') {
      try {
        menuTypes = JSON.parse(menuTypes);
      } catch (error) {
        console.error('Error parsing menuTypes:', error);
        menuTypes = null;
      }
    }

    console.log('Updating menu with data:', { name, description, price, available, category, menuTypes });

    // Create an object with only the fields that are defined
    const updates = {};
    const allowedFields = ["name", "description", "price", "available", "category", "menuTypes"];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle image upload if new file is provided
    if (req.file) {
      updates.image = `/uploads/menu-images/${req.file.filename}`;
    }

    const menu = await Menu.findOneAndUpdate(
      { _id: id },
      updates,
      { new: true, runValidators: true }
    ).populate("category");

    if (!menu) {
      return res.status(404).json({
        status: false,
        message: "Menu not found",
      });
    }

    console.log('Menu updated:', menu);

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

    const menu = await Menu.findById(id);

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu not found",
      });
    }

    // Delete image file if exists
    if (menu.image) {
      const imagePath = `.${menu.image}`;
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Menu.findByIdAndDelete(id);

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

    // Validate category exists and belongs to user
    const category = await Category.findOne({
      _id: categoryId,
    });
    if (!category) {
      return res.status(404).json({
        status: false,
        message: "Category not found",
      });
    }

    // Build filter - only show available items by default for customers
    const filter = { category: categoryId };
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

    // Build filter object - no default availability filter for management
    const filter = {};
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
    
    // Get all available menus and filter by menu type
    const menus = await Menu.find({ available: true })
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
        if (menu.menuTypes && menu.menuTypes[menuType]) {
          menuObj.price = menu.menuTypes[menuType].price;
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

    console.log('getMenusByCategoryAndTable called with:', { categoryId, tableNumber });

    if (!categoryId || !tableNumber) {
      return res.status(400).json({
        success: false,
        message: "Category ID and table number are required",
      });
    }

    const menuType = getMenuTypeFromTable(tableNumber);
    console.log('Determined menu type:', menuType);

    // Validate category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Get menus for this category
    const menus = await Menu.find({ 
      category: categoryId, 
      available: true 
    })
      .populate("category")
      .sort({ name: 1 });

    console.log('Found menus:', menus.length);
    console.log('Sample menu structure:', menus[0] ? {
      name: menus[0].name,
      menuTypes: menus[0].menuTypes,
      available: menus[0].available
    } : 'No menus found');

    // Filter and transform menus based on menu type
    const filteredMenus = menus
      .filter(menu => {
        console.log(`Checking menu ${menu.name}:`, {
          hasMenuTypes: !!menu.menuTypes,
          menuTypeData: menu.menuTypes?.[menuType],
          menuTypeAvailable: menu.menuTypes?.[menuType]?.available
        });
        
        if (menu.menuTypes && menu.menuTypes[menuType]) {
          return menu.menuTypes[menuType].available;
        }
        return menuType === 'REGULAR';
      })
      .map(menu => {
        const menuObj = menu.toObject();
        if (menu.menuTypes && menu.menuTypes[menuType]) {
          menuObj.price = menu.menuTypes[menuType].price;
        }
        menuObj.menuType = menuType;
        return menuObj;
      });

    console.log('Filtered menus count:', filteredMenus.length);

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
    console.error('Error in getMenusByCategoryAndTable:', error);
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
