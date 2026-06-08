import express from 'express';
import multer from 'multer'; // تأكدي من وجود هذا السطر إذا كنتِ تحتاجينه
import { signup, login, getProfile, updateProfile ,forgotPassword, resetPassword} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import  upload  from '../middlewares/upload.js'; // الاستيراد الصحيح من الـ middleware

let router = express.Router();

// السطر رقم 8 الذي يسبب المشكلة يجب حذفه تماماً

// استخدام الـ upload الذي تم استيراده
router.post('/signup', upload.single('idFile'), signup);

router.post('/login', login);
router.get('/profile', protect, getProfile);
router.patch('/profile', protect, updateProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);


export default router;