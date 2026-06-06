import express from 'express';
import { protect, requireVerifiedSeller } from '../middlewares/authMiddleware.js';
import {
  getAllRfqs, getRfqById, createRfq, updateRfq, cancelRfq, 
  getMyRfqs, getRfqOffers, sendOffer, acceptOffer, rejectOffer, getMyOffers,
} from '../controllers/rfqController.js';
import {
  getAllProducts, getProductById, createProduct, updateProduct, 
  deleteProduct, getMyProducts, getSellerProfile,
} from '../controllers/marketplaceController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 * name: RFQs
 * description: عمليات طلبات عرض الأسعار
 * name: Marketplace
 * description: إدارة المنتجات
 */

// ──────────────── RFQ Routes ────────────────

/**
 * @swagger
 * /api/rfqs:
 * get:
 * summary: الحصول على جميع الطلبات
 * tags: [RFQs]
 * post:
 * summary: إنشاء طلب جديد
 * tags: [RFQs]
 * security: [{bearerAuth: []}]
 */
router.get('/rfqs', getAllRfqs);
router.post('/rfqs', protect, createRfq);

/**
 * @swagger
 * /api/rfqs/buyer/my:
 * get:
 * summary: طلبات المشتري الخاصة
 * tags: [RFQs]
 * security: [{bearerAuth: []}]
 */
router.get('/rfqs/buyer/my', protect, getMyRfqs);

/**
 * @swagger
 * /api/rfqs/{id}:
 * get:
 * summary: تفاصيل طلب محدد
 * tags: [RFQs]
 * parameters: [{in: path, name: id, required: true, schema: {type: string}}]
 * put:
 * summary: تحديث طلب
 * tags: [RFQs]
 * security: [{bearerAuth: []}]
 * delete:
 * summary: إلغاء طلب
 * tags: [RFQs]
 * security: [{bearerAuth: []}]
 */
router.get('/rfqs/:id', getRfqById);
router.put('/rfqs/:id', protect, updateRfq);
router.delete('/rfqs/:id', protect, cancelRfq);

/**
 * @swagger
 * /api/rfqs/{id}/offers:
 * get:
 * summary: عروض الطلب
 * tags: [RFQs]
 * post:
 * summary: إرسال عرض (للموردين فقط)
 * tags: [RFQs]
 * security: [{bearerAuth: []}]
 */
router.get('/rfqs/:id/offers', getRfqOffers);
router.post('/rfqs/:id/offers', protect, requireVerifiedSeller, sendOffer);

// ──────────────── Marketplace Routes ────────────────

/**
 * @swagger
 * /api/marketplace:
 * get:
 * summary: الحصول على جميع المنتجات
 * tags: [Marketplace]
 */
router.get('/marketplace', getAllProducts);

/**
 * @swagger
 * /api/marketplace/products:
 * post:
 * summary: إضافة منتج جديد
 * tags: [Marketplace]
 * security: [{bearerAuth: []}]
 */
router.get('/marketplace/products/my', protect, requireVerifiedSeller, getMyProducts);
router.post('/marketplace/products', protect, requireVerifiedSeller, createProduct);

/**
 * @swagger
 * /api/marketplace/products/{id}:
 * put:
 * summary: تحديث منتج
 * tags: [Marketplace]
 * security: [{bearerAuth: []}]
 * delete:
 * summary: حذف منتج
 * tags: [Marketplace]
 * security: [{bearerAuth: []}]
 */
router.put('/marketplace/products/:id', protect, updateProduct);
router.delete('/marketplace/products/:id', protect, deleteProduct);

/**
 * @swagger
 * /api/marketplace/{id}:
 * get:
 * summary: تفاصيل منتج
 * tags: [Marketplace]
 */
router.get('/marketplace/:id', getProductById);

export default router;