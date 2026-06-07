import express from 'express';
import { signup , login ,getProfile, updateProfile} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
let router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.patch('/profile', protect, updateProfile);



export default router;