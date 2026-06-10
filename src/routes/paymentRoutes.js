import express from 'express';
import { 
  createPaymentIntent, 
  confirmPayment, 
  getPaymentDetails, 
  updatePaymentStatus 
} from '../controllers/paymentController.js';
import { protect } from '../middlewares/authMiddleware.js';
import adminMiddleware from '../middlewares/adminMiddleware.js';

const router = express.Router();

// Route to create a Stripe payment intent
router.post('/create-intent', protect, createPaymentIntent);

// Route to confirm card payment in DB
router.post('/confirm', protect, confirmPayment);

// Route to fetch payment details
router.get('/:id', protect, getPaymentDetails);

// Route to update payment status (only admin can change to other states, or general endpoint)
router.patch('/:id/status', protect, adminMiddleware, updatePaymentStatus);

export default router;
