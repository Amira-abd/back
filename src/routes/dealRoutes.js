import express from "express";
import { getAllDeals, getDealMessages, acceptDeal, createDeal, getDealById, processDealPayment, cancelDealPayment } from "../controllers/dealController.js";
import { protect, requireVerifiedUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET DEALS
router.get("/", protect, requireVerifiedUser, getAllDeals);

// GET DEAL BY ID
router.get("/:id", protect, requireVerifiedUser, getDealById);

// GET MESSAGES
router.get("/:id/messages", protect, requireVerifiedUser, getDealMessages);

// ACCEPT DEAL
router.patch("/:id/accept", protect, requireVerifiedUser, acceptDeal);

// CREATE DEAL
router.post("/", protect, requireVerifiedUser, createDeal);

// PAY FOR DEAL
router.post("/:id/pay", protect, requireVerifiedUser, processDealPayment);

// CANCEL PAYMENT
router.post("/:id/cancel-payment", protect, requireVerifiedUser, cancelDealPayment);

export default router;