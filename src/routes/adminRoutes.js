import express from "express";
const router = express.Router();

import * as adminController from "../controllers/adminController.js";
import { protect } from "../middlewares/authMiddleware.js"; // 
import adminMiddleware from "../middlewares/adminMiddleware.js";

router.get(
  "/verifications",
  protect, 
  adminMiddleware,
  adminController.getAllVerifications
);

router.get(
  "/verifications/:id",
  protect,
  adminMiddleware,
  adminController.getVerificationDetails
);

router.patch(
  "/verifications/:id/approve",
  protect, 
  adminMiddleware,
  adminController.approveVerification
);

router.patch(
  "/verifications/:id/reject",
  protect, 
  adminMiddleware,
  adminController.rejectVerification
);

// Admin User Verification Routes
router.get(
  "/users",
  protect,
  adminMiddleware,
  adminController.getAllUsers
);

router.get(
  "/users/pending",
  protect,
  adminMiddleware,
  adminController.getPendingUsers
);

router.patch(
  "/users/:id/approve",
  protect,
  adminMiddleware,
  adminController.approveUserVerification
);

router.patch(
  "/users/:id/reject",
  protect,
  adminMiddleware,
  adminController.rejectUserVerification
);

export default router;