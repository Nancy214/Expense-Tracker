import { RequestHandler, Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
  getBills,
  getBillById,
  createBill,
  updateBill,
  deleteBill,
  updateBillStatus,
  getBillsByStatus,
  getOverdueBills,
  getUpcomingBills,
  getBillStats,
} from "../controllers/bill.controller";

const router = Router();

// Basic CRUD operations
router.get(
  "/",
  authenticateToken as RequestHandler,
  getBills as RequestHandler
);
router.get(
  "/stats",
  authenticateToken as RequestHandler,
  getBillStats as RequestHandler
);
router.get(
  "/:id",
  authenticateToken as RequestHandler,
  getBillById as RequestHandler
);
router.post(
  "/",
  authenticateToken as RequestHandler,
  createBill as RequestHandler
);
router.put(
  "/:id",
  authenticateToken as RequestHandler,
  updateBill as RequestHandler
);
router.delete(
  "/:id",
  authenticateToken as RequestHandler,
  deleteBill as RequestHandler
);

// Bill status operations
router.patch(
  "/:id/status",
  authenticateToken as RequestHandler,
  updateBillStatus as RequestHandler
);
router.get(
  "/status/:status",
  authenticateToken as RequestHandler,
  getBillsByStatus as RequestHandler
);

// Special queries
router.get(
  "/overdue/all",
  authenticateToken as RequestHandler,
  getOverdueBills as RequestHandler
);
router.get(
  "/upcoming/all",
  authenticateToken as RequestHandler,
  getUpcomingBills as RequestHandler
);

export default router;
