import express from "express";
const router = express.Router();

import * as adminController from "../controllers/adminController.js";
import  authMiddleware  from "../middlewares/authMiddleware.js";
import adminMiddleware from "../middlewares/adminMiddleware.js";

router.get(
  "/verifications",
  authMiddleware,
  adminMiddleware,
  adminController.getAllVerifications
);

router.get(
  "/verifications/:id",
  authMiddleware,
  adminMiddleware,
  adminController.getVerificationDetails
);

router.patch(
  "/verifications/:id/approve",
  authMiddleware,
  adminMiddleware,
  adminController.approveVerification
);

router.patch(
  "/verifications/:id/reject",
  authMiddleware,
  adminMiddleware,
  adminController.rejectVerification
);

export default router;