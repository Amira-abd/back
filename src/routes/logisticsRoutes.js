import express from 'express';
import { getShippingEstimates } from '../controllers/logisticsController.js';
import { protect, requireVerifiedUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Get shipping cost estimates
router.post('/estimate', protect, requireVerifiedUser, getShippingEstimates);

export default router;
