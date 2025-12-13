import Order from "../models/orderModel.js";

/**
 * Generates a professional order number with pattern: LAQ-YYMMDD-XXX
 * LAQ = Restaurant prefix
 * YYMMDD = Current date (2-digit year)
 * XXX = Sequential number (3 digits)
 */
export const generateOrderNumber = async () => {
  // Use shorter format for mobile screens
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const timeStr = now.getTime().toString().slice(-3);
  return `LAQ-${year}${month}${day}-${timeStr}`;
};

/**
 * Example format: LAQ-241118-123
 * - Much shorter for mobile screens
 * - Still unique and professional
 * - Easy to read and remember
 */