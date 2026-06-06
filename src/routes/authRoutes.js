import express from 'express';
import { signup, login } from '../controllers/authController.js';

let router = express.Router();

/**
 * @swagger
 * /api/auth/signup:
 * post:
 * summary: تسجيل مستخدم جديد
 * tags: [Auth]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * name:
 * type: string
 * email:
 * type: string
 * password:
 * type: string
 * responses:
 * 201:
 * description: تم إنشاء المستخدم بنجاح
 */
router.post('/signup', signup);

/**
 * @swagger
 * /api/auth/login:
 * post:
 * summary: تسجيل دخول المستخدم
 * tags: [Auth]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * email:
 * type: string
 * password:
 * type: string
 * responses:
 * 200:
 * description: تم تسجيل الدخول بنجاح
 * 401:
 * description: بيانات الدخول غير صحيحة
 */
router.post('/login', login);

export default router;