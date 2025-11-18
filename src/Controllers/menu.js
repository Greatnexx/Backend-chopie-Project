
import Menu from "../models/menuModel.js";
import Category from "../models/categoryModel.js";

// Create a new menu
export const createMenu = async (req, res) => {
  try {
    // const user_id = req.user._id;
    const { name, description, price, image, available, category } = req.body;

    // if (!user_id) {
    //   return res.status(401).json({
    //     status: false,
    //     message: "UnAuthorized",
    //   });
    // }

    // Validate that category exists and belongs to the user
    const categoryExists = await Category.findOne({
      _id: category,
    });
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Category does not exist",
      });
    }

    const menu = new Menu({
      name,
      description,
      price,
      image,
      available,
      category,
    });

    await menu.save();

    // Populate category info in response
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
    const { name, description, price, image, available, category } = req.body;
    const {id} = req.params;

    // / Create an object with only the fields that are defined
    // This is a dynamic way to update only the fields the user sends in their request.
    // we loop through the allowed field if the field is part of the req.body add to the object called updates
    const updates = {};
    const allowedFields = ["name", "description", "price", "image", "available", "category"];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    

    const menu = await Menu.findOneAndUpdate(
      { _id: id },
      updates,
      { new: true, runValidators: true }
    )

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
    res.status(500).json({
      status: false,
      message: "Error updating menu",
      error: error.message,
    });
  }
};

// Delete menu
// export const deleteMenu = async (req, res) => {
//   try {
//     const user_id = req.user._id;

//     if (!user_id) {
//       return res.status(401).json({
//         success: false,
//         message: "UnAuthorized",
//       });
//     }

//     const menu = await Menu.findOneAndDelete({
//       _id: req.params.id,
//       user: user_id,
//     });

//     if (!menu) {
//       return res.status(404).json({
//         success: false,
//         message: "Menu not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Menu deleted successfully",
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Error deleting menu",
//       error: error.message,
//     });
//   }
// };

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

    // if (!user_id) {
    //   return res.status(401).json({
    //     status: false,
    //     message: "UnAuthorized",
    //   });
    // }

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
      user: user_id,
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
