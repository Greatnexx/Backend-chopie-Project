import express from "express";
import { protect, authorize } from "../middlewares/restaurantAuth.js";
import { getAuditTrail, getAuditStats } from "../Controllers/auditTrailController.js";

const router = express.Router();

// Audit trail routes - accessible by SuperAdmin and TransactionAdmin
router.get("/audit-trail", protect, authorize("SuperAdmin", "TransactionAdmin"), getAuditTrail);
router.get("/audit-stats", protect, authorize("SuperAdmin", "TransactionAdmin"), getAuditStats);

export default router;