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

// Public Routes
router.get('/categories', getAllCategories);
router.get('/categories/:id', getCategoryById);

// Admin Only Routes
router.post('/categories', protect, admin, createCategory);
router.put('/categories/:id', protect, admin, updateCategory);
router.delete('/categories/:id', protect, admin, deleteCategory);

export default router;