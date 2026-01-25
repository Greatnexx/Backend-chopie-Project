import express from "express";
import { protect, authorize } from "../middlewares/restaurantAuth.js";
import { 
  getFinancialSettings, 
  updatePaymentMethods, 
  updateTaxRate, 
  updateReceiptSettings 
} from "../Controllers/financialSettingsController.js";

const router = express.Router();

// Financial settings routes - accessible by SuperAdmin and TransactionAdmin
router.get("/financial-settings", protect, authorize("SuperAdmin", "TransactionAdmin"), getFinancialSettings);
router.patch("/payment-methods", protect, authorize("SuperAdmin", "TransactionAdmin"), updatePaymentMethods);
router.patch("/tax-rate", protect, authorize("SuperAdmin", "TransactionAdmin"), updateTaxRate);
router.patch("/receipt-settings", protect, authorize("SuperAdmin", "TransactionAdmin"), updateReceiptSettings);

export default router;