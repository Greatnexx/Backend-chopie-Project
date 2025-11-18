import Order from "../models/orderModel.js";

/**
 * Generates a professional order number with pattern: CHO-YYYYMMDD-XXXX
 * CHO = Chopie Restaurant prefix
 * YYYYMMDD = Current date
 * XXXX = Sequential number for the day (padded to 4 digits)
 */
export const generateOrderNumber = async () => {
  // Use timestamp-based approach for speed
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.getTime().toString().slice(-6);
  return `CHO-${dateStr}-${timeStr}`;
};

/**
 * Alternative patterns you can use:
 * 
 * 1. CHO-YYYYMMDD-XXXX (Current implementation)
 *    Example: CHO-20241118-0001
 * 
 * 2. CHO-YY-MM-XXXX (Shorter year)
 *    Example: CHO-24-11-0001
 * 
 * 3. CHO-YYMMDD-TXXX (T for table-based)
 *    Example: CHO-241118-T001
 * 
 * 4. CHOP-YYYYMMDD-HHMM-XX (Include time)
 *    Example: CHOP-20241118-1430-01
 */