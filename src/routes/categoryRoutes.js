import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import admin  from '../middlewares/adminMiddleware.js';
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';

const router = express.Router();

// ──────────────────────────────────────────────
// Category routes
// ──────────────────────────────────────────────

/**
 * @swagger
 * tags:
 * name: Categories
 * description: إدارة تصنيفات المنتجات
 */

/**
 * @swagger
 * /api/categories:
 * get:
 * summary: الحصول على جميع التصنيفات
 * tags: [Categories]
 * responses:
 * 200:
 * description: قائمة بجميع التصنيفات
 * post:
 * summary: إنشاء تصنيف جديد (للإدارة فقط)
 * tags: [Categories]
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * name:
 * type: string
 * responses:
 * 201:
 * description: تم إنشاء التصنيف بنجاح
 */
router.get('/categories', getAllCategories);
router.post('/categories', protect, admin, createCategory);

/**
 * @swagger
 * /api/categories/{id}:
 * get:
 * summary: الحصول على تفاصيل تصنيف محدد
 * tags: [Categories]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * responses:
 * 200:
 * description: تفاصيل التصنيف
 * put:
 * summary: تحديث بيانات تصنيف (للإدارة فقط)
 * tags: [Categories]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * requestBody:
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * name:
 * type: string
 * responses:
 * 200:
 * description: تم التحديث بنجاح
 * delete:
 * summary: حذف تصنيف (للإدارة فقط)
 * tags: [Categories]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * responses:
 * 200:
 * description: تم الحذف بنجاح
 */
router.get('/categories/:id', getCategoryById);
router.put('/categories/:id', protect, admin, updateCategory);
router.delete('/categories/:id', protect, admin, deleteCategory);
export default router;