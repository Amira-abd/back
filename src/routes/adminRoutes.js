import express from "express";
const router = express.Router();

import * as adminController from "../controllers/adminController.js";
import { protect } from "../middlewares/authMiddleware.js"; // 👈 التعديل هنا
import adminMiddleware from "../middlewares/adminMiddleware.js";
/**
 * @swagger
 * components:
 * securitySchemes:
 * bearerAuth:
 * type: http
 * scheme: bearer
 * bearerFormat: JWT
 * * tags:
 * name: Admin
 * description: عمليات الإدارة والتحقق
 */

/**
 * @swagger
 * /api/admin/verifications:
 * get:
 * summary: الحصول على جميع طلبات التحقق
 * tags: [Admin]
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: قائمة بطلبات التحقق
 */
router.get("/verifications", protect, adminMiddleware, adminController.getAllVerifications);

/**
 * @swagger
 * /api/admin/verifications/{id}:
 * get:
 * summary: الحصول على تفاصيل طلب تحقق محدد
 * tags: [Admin]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * responses:
 * 200:
 * description: تفاصيل الطلب
 */
router.get("/verifications/:id", protect, adminMiddleware, adminController.getVerificationDetails);

/**
 * @swagger
 * /api/admin/verifications/{id}/approve:
 * patch:
 * summary: قبول طلب تحقق
 * tags: [Admin]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * responses:
 * 200:
 * description: تم قبول الطلب بنجاح
 */
router.patch("/verifications/:id/approve", protect, adminMiddleware, adminController.approveVerification);

/**
 * @swagger
 * /api/admin/verifications/{id}/reject:
 * patch:
 * summary: رفض طلب تحقق
 * tags: [Admin]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * responses:
 * 200:
 * description: تم رفض الطلب بنجاح
 */
router.patch("/verifications/:id/reject", protect, adminMiddleware, adminController.rejectVerification);

export default router;