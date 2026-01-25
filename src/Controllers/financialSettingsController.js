import Restaurant from "../models/restaurantModel.js";
import { logAuditTrail } from "./auditTrailController.js";

// Get financial settings
export const getFinancialSettings = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurantId)
      .select('paymentMethods taxRate currency receiptSettings');

    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: "Restaurant not found",
      });
    }

    res.status(200).json({
      status: true,
      data: {
        paymentMethods: restaurant.paymentMethods || { cash: true, transfer: true },
        taxRate: restaurant.taxRate || 0,
        currency: restaurant.currency || 'NGN',
        receiptSettings: restaurant.receiptSettings || {
          showTax: true,
          showServiceCharge: false,
          footerText: 'Thank you for dining with us!'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching financial settings",
      error: error.message,
    });
  }
};

// Update payment methods
export const updatePaymentMethods = async (req, res) => {
  try {
    const { cash, transfer } = req.body;

    const restaurant = await Restaurant.findById(req.restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: "Restaurant not found",
      });
    }

    const oldValues = restaurant.paymentMethods;
    const newValues = { cash: !!cash, transfer: !!transfer };

    restaurant.paymentMethods = newValues;
    await restaurant.save();

    // Log audit trail
    await logAuditTrail({
      restaurantId: req.restaurantId,
      userId: req.user._id,
      action: "PAYMENT_METHOD_UPDATED",
      entityType: "Settings",
      entityId: restaurant._id,
      oldValues,
      newValues,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      status: true,
      message: "Payment methods updated successfully",
      data: newValues
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error updating payment methods",
      error: error.message,
    });
  }
};

// Update tax rate
export const updateTaxRate = async (req, res) => {
  try {
    const { taxRate } = req.body;

    if (taxRate < 0 || taxRate > 100) {
      return res.status(400).json({
        status: false,
        message: "Tax rate must be between 0 and 100",
      });
    }

    const restaurant = await Restaurant.findById(req.restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: "Restaurant not found",
      });
    }

    const oldValue = restaurant.taxRate;
    restaurant.taxRate = taxRate;
    await restaurant.save();

    // Log audit trail
    await logAuditTrail({
      restaurantId: req.restaurantId,
      userId: req.user._id,
      action: "SETTINGS_UPDATED",
      entityType: "Settings",
      entityId: restaurant._id,
      details: { field: 'taxRate' },
      oldValues: { taxRate: oldValue },
      newValues: { taxRate },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      status: true,
      message: "Tax rate updated successfully",
      data: { taxRate }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error updating tax rate",
      error: error.message,
    });
  }
};

// Update receipt settings
export const updateReceiptSettings = async (req, res) => {
  try {
    const { showTax, showServiceCharge, footerText } = req.body;

    const restaurant = await Restaurant.findById(req.restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        status: false,
        message: "Restaurant not found",
      });
    }

    const oldValues = restaurant.receiptSettings;
    const newValues = {
      showTax: !!showTax,
      showServiceCharge: !!showServiceCharge,
      footerText: footerText || 'Thank you for dining with us!'
    };

    restaurant.receiptSettings = newValues;
    await restaurant.save();

    // Log audit trail
    await logAuditTrail({
      restaurantId: req.restaurantId,
      userId: req.user._id,
      action: "SETTINGS_UPDATED",
      entityType: "Settings",
      entityId: restaurant._id,
      details: { field: 'receiptSettings' },
      oldValues,
      newValues,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      status: true,
      message: "Receipt settings updated successfully",
      data: newValues
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error updating receipt settings",
      error: error.message,
    });
  }
};