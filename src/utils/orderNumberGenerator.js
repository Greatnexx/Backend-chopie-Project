import Order from "../models/orderModel.js";

/**
 * Generates restaurant-specific prefix from restaurant name
 * Takes first 3 letters of restaurant name in uppercase
 */
const generateRestaurantPrefix = (restaurantName) => {
  if (!restaurantName) return 'ORD';
  return restaurantName
    .replace(/[^a-zA-Z]/g, '') // Remove non-letters
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X'); // Pad with X if less than 3 letters
};

/**
 * Generates a professional order number with pattern: XXX-YYMMDD-NNN
 * XXX = Restaurant prefix (first 3 letters of restaurant name)
 * YYMMDD = Current date (2-digit year)
 * NNN = Sequential number (3 digits)
 */
export const generateOrderNumber = async (restaurant) => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Generate restaurant-specific prefix
  const prefix = generateRestaurantPrefix(restaurant?.name);
  
  // Get count of orders for this restaurant today
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const endOfDay = new Date(now.setHours(23, 59, 59, 999));
  
  const todayOrderCount = await Order.countDocuments({
    restaurantId: restaurant?._id,
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });
  
  const sequentialNumber = (todayOrderCount + 1).toString().padStart(3, '0');
  
  return `${prefix}-${dateStr}-${sequentialNumber}`;
};

/**
 * Example formats:
 * - Danny's Restaurant: DAN-241118-001
 * - Pizza Palace: PIZ-241118-001
 * - Chopie: CHO-241118-001
 */