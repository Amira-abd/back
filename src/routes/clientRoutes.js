import express from 'express';
import { protect, requireVerifiedSeller } from '../middlewares/authMiddleware.js';

// ── RFQ controllers ──
import {
  getAllRfqs,
  getRfqById,
  createRfq,
  updateRfq,
  cancelRfq,
  getMyRfqs,
  getRfqOffers,
  sendOffer,
  acceptOffer,
  rejectOffer,
  getMyOffers,
} from '../controllers/rfqController.js';

// ── Marketplace controllers ──
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
  getSellerProfile,
} from '../controllers/marketplaceController.js';

const router = express.Router();

// ──────────────────────────────────────────────
// RFQ routes
// ──────────────────────────────────────────────

// Static routes — MUST be before parameterized routes
router.get('/rfqs/buyer/my', protect, getMyRfqs);
router.get('/rfqs/seller/my-offers', protect, requireVerifiedSeller, getMyOffers);

// Public
router.get('/rfqs', getAllRfqs);
router.get('/rfqs/:id', getRfqById);
router.get('/rfqs/:id/offers', getRfqOffers);

// Buyer (any authenticated)
router.post('/rfqs', protect, createRfq);
router.put('/rfqs/:id', protect, updateRfq);
router.delete('/rfqs/:id', protect, cancelRfq);
router.put('/rfqs/:rfqId/offers/:offerId/accept', protect, acceptOffer);
router.put('/rfqs/:rfqId/offers/:offerId/reject', protect, rejectOffer);

// Seller (verified only)
router.post('/rfqs/:id/offers', protect, requireVerifiedSeller, sendOffer);

// ──────────────────────────────────────────────
// Marketplace routes
// ──────────────────────────────────────────────

// Static routes — MUST be before parameterized routes
router.get('/marketplace/products/my', protect, requireVerifiedSeller, getMyProducts);

// Public
router.get('/marketplace', getAllProducts);
router.get('/marketplace/sellers/:sellerId', getSellerProfile);
router.get('/marketplace/:id', getProductById);

// Protected — verified seller only
router.post('/marketplace/products', protect, requireVerifiedSeller, createProduct);
router.put('/marketplace/products/:id', protect, updateProduct);
router.delete('/marketplace/products/:id', protect, deleteProduct);

export default router;