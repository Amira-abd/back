import express from 'express';
import multer from 'multer'; 
import { signup, login, getProfile, updateProfile, forgotPassword, resetPassword, submitVerification } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/upload.js'; 

let router = express.Router();

const uploadFields = upload.fields([
  { name: 'nationalIdDoc', maxCount: 1 },
  { name: 'companyRegisterDoc', maxCount: 1 },
  { name: 'taxCertificateDoc', maxCount: 1 },
  { name: 'profileImage', maxCount: 1 },
  { name: 'idFile', maxCount: 1 } // for backward compatibility
]);

router.post('/signup', uploadFields, signup);
router.post('/verify', protect, uploadFields, submitVerification);

router.post('/login', login);
router.get('/profile', protect, getProfile);
router.patch('/profile', protect, updateProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;