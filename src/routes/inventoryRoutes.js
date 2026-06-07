import express from "express";
import  {getInventory,getInventoryStats,flagProduct,verifyProduct,hideProduct} from "../controllers/inventoryController.js";

const router = express.Router();

// GET ALL INVENTORY
router.get("/", getInventory);

// GET STATS
router.get("/stats", getInventoryStats);

// FLAG PRODUCT
router.patch("/:id/flag", flagProduct);

// VERIFY PRODUCT
router.patch("/:id/verify", verifyProduct);

// HIDE PRODUCT
router.patch("/:id/hide", hideProduct);

export default router;