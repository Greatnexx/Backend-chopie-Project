import Category from "../models/categoryModel.js";
import Menu from "../models/menuModel.js"; // changed from Product to Menu

// Create a new category
export const createCategory = async (req, res, next) => {
  try {
    const { name, image } = req.body;

    // Get restaurantId from tenant middleware or authenticated user
    let restaurantId = req.restaurantId;
    if (!restaurantId && req.user && req.user.restaurantId) {
      restaurantId = req.user.restaurantId;
    }

    if (!restaurantId) {
      return res.status(400).json({
        status: false,
        message: "Restaurant context required. Please ensure you're logged in as a restaurant user.",
      });
    }
    
    const query = { 
      name: name.toLowerCase(),  // Match the schema's lowercase conversion
      restaurantId: restaurantId
    };

    const existingCategory = await Category.findOne(query);
    
    if (existingCategory) {
      return res.status(400).json({
        status: false,
        message: "Category already exists",
      });
    }

    const categoryData = { 
      name, 
      image,
      restaurantId: restaurantId
    };

    const category = new Category(categoryData);
    await category.save();

    res.status(201).json({
      status: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    // Handle MongoDB duplicate key error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      return res.status(400).json({
        status: false,
        message: "Category already exists for this restaurant",
      });
    }
    
    res.status(500).json({
      status: false,
      message: "Error creating category",
      error: error.message,
    });
  }
};

// Get all categories
export const getCategories = async (req, res) => {
  try {
    // Get restaurantId from tenant middleware or authenticated user
    let restaurantId = req.restaurantId;
    if (!restaurantId && req.user && req.user.restaurantId) {
      restaurantId = req.user.restaurantId;
    }

    if (!restaurantId) {
      return res.status(400).json({
        status: false,
        message: "Restaurant context required",
      });
    }

    const query = { restaurantId: restaurantId };
    const categories = await Category.find(query).sort({ name: 1 }).lean();

    res.status(200).json({
      status: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching categories",
      error: error.message,
    });
  }
};

// Get single category by ID
export const getCategoryById = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.restaurantId) {
      query.restaurantId = req.restaurantId;
    }

    const category = await Category.findOne(query);

    if (!category) {
      return res.status(404).json({
        status: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      status: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching category",
      error: error.message,
    });
  }
};

// Update category
export const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const categoryId = req.params.id;

    const existingQuery = {
      name: name.toLowerCase(),  // Match the schema's lowercase conversion
      _id: { $ne: categoryId },
    };
    if (req.restaurantId) {
      existingQuery.restaurantId = req.restaurantId;
    }

    const existingCategory = await Category.findOne(existingQuery);

    if (existingCategory) {
      return res.status(400).json({
        status: false,
        message: "Category name already exists",
      });
    }

    const updateQuery = { _id: categoryId };
    if (req.restaurantId) {
      updateQuery.restaurantId = req.restaurantId;
    }

    const category = await Category.findOneAndUpdate(
      updateQuery,
      { name },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        status: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error updating category",
      error: error.message,
    });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    const menuQuery = { category: categoryId };
    if (req.restaurantId) {
      menuQuery.restaurantId = req.restaurantId;
    }

    const menuCount = await Menu.countDocuments(menuQuery);
    if (menuCount > 0) {
      return res.status(400).json({
        status: false,
        message: `Cannot delete category. It has ${menuCount} menu items associated.`,
      });
    }

    const deleteQuery = { _id: categoryId };
    if (req.restaurantId) {
      deleteQuery.restaurantId = req.restaurantId;
    }

    const category = await Category.findOneAndDelete(deleteQuery);

    if (!category) {
      return res.status(404).json({
        status: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting category",
      error: error.message,
    });
  }
};

// Get category with its menu items
export const getCategoryWithMenu = async (req, res) => {
  try {
    const categoryId = req.params.id;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const menuItems = await Menu.find({ category: categoryId }).populate(
      "category"
    );

    res.status(200).json({
      success: true,
      data: {
        category,
        menu: menuItems,
        menuCount: menuItems.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching category with menu items",
      error: error.message,
    });
  }
};
