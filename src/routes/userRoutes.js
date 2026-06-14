import express from 'express';
import { getProfile, updateAvatar, deleteAvatar } from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

// GET user profile
router.get('/profile', protect, getProfile);

// PATCH upload/update user avatar
router.patch('/profile/avatar', protect, upload.single('avatar'), updateAvatar);

// DELETE user avatar
router.delete('/profile/avatar', protect, deleteAvatar);

export default router;
