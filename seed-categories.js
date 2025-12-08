import mongoose from 'mongoose';
import Category from './src/models/categoryModel.js';
import dotenv from 'dotenv';

dotenv.config();

const categories = [
  { name: 'Non-Alcoholic Beverages', image: '🥤' },
  { name: 'Juices & Energy Drinks', image: '🍹' },
  { name: 'Bitters', image: '🍸' },
  { name: 'Red Wine', image: '🍷' },
  { name: 'Champagne', image: '🍾' },
  { name: 'Vodka | Tequila | Gin', image: '🍸' },
  { name: 'Whiskey | Cognac', image: '🥃' },
  { name: 'Hookah & Cigarettes', image: '🚬' }
];  

const seedCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('Cleared existing categories');

    // Insert new categories
    const createdCategories = await Category.insertMany(categories);
    console.log('Categories created:', createdCategories);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
};

seedCategories();