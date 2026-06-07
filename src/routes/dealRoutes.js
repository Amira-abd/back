import express from "express";
import {getAllDeals,getDealMessages, acceptDeal} from "../controllers/dealController.js";

const router = express.Router();

// GET DEALS
router.get("/", getAllDeals);

// GET MESSAGES
router.get("/:id/messages", getDealMessages);

// ACCEPT DEAL
router.patch("/:id/accept", acceptDeal);

export default router;