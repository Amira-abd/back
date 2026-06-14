import express from 'express';
import { getPricingSuggestion } from '../controllers/pricingController.js';
import { protect, requireVerifiedUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Get smart pricing suggestions
router.get('/suggest', protect, requireVerifiedUser, getPricingSuggestion);

export default router;
