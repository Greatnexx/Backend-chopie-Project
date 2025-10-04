import Category from "../models/categoryModel.js";
import Menu from "../models/menuModel.js"; // changed from Product to Menu

// Create a new category
export const createCategory = async (req, res, next) => {
  try {
    const { name, image } = req.body;

   
    // Check if category already exists
    const existingCategory = await Category.findOne({
      name: name.toLowerCase(),
    });
    if (existingCategory) {
      return res.status(400).json({
        status: false,
        message: "Category already exists",
      });
    }

    const category = new Category({ name, image });
    await category.save();

    res.status(201).json({
      status: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
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
    const categories = await Category.find().sort({ name: 1 });

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
    const category = await Category.findById(req.params.id);

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

    const existingCategory = await Category.findOne({
      name: name.toLowerCase(),
      _id: { $ne: categoryId },
    });

    if (existingCategory) {
      return res.status(400).json({
        status: false,
        message: "Category name already exists",
      });
    }

    const category = await Category.findByIdAndUpdate(
      categoryId,
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

    // Check if category has menu items
    const menuCount = await Menu.countDocuments({ category: categoryId });
    if (menuCount > 0) {
      return res.status(400).json({
        status: false,
        message: `Cannot delete category. It has ${menuCount} menu items associated.`,
      });
    }

    const category = await Category.findByIdAndDelete(categoryId);

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
