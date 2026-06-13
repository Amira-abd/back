import express from "express";
import {
  getInventory,
  getInventoryStats,
  flagProduct,
  verifyProduct,
  hideProduct,
  getInventoryDashboard,
  getInventoryListings
} from "../controllers/inventoryController.js";

const router = express.Router();

// GET ALL INVENTORY
router.get("/", getInventory);

// GET STATS
router.get("/stats", getInventoryStats);

// GET DASHBOARD STATS
router.get("/dashboard", getInventoryDashboard);

// GET PAGINATED LISTINGS
router.get("/listings", getInventoryListings);

// FLAG PRODUCT
router.patch("/:id/flag", flagProduct);

// VERIFY PRODUCT
router.patch("/:id/verify", verifyProduct);

// HIDE PRODUCT
router.patch("/:id/hide", hideProduct);

export default router;