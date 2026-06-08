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

export default router;