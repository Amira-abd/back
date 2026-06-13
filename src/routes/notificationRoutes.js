import express from 'express';
import { 
  getMyNotifications, 
  getUnreadCount, 
  updateNotificationStatus, 
  markAllAsRead, 
  deleteNotification 
} from '../controllers/notificationController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getMyNotifications);
router.get('/unread', protect, getUnreadCount);
router.patch('/read-all', protect, markAllAsRead);
router.patch('/:id/read', protect, updateNotificationStatus);
router.delete('/:id', protect, deleteNotification);

export default router;
