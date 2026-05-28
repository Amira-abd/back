const express = require('express')
const router = express.Router()
const { protect } = require('../middlewares/authMiddleware')
const { admin } = require('../middlewares/adminMiddleware')

const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController')

// ──────────────────────────────────────────────
// Category routes
// ──────────────────────────────────────────────

// Public
router.get('/categories', getAllCategories)
router.get('/categories/:id', getCategoryById)

// Admin only
router.post('/categories', protect, admin, createCategory)
router.put('/categories/:id', protect, admin, updateCategory)
router.delete('/categories/:id', protect, admin, deleteCategory)

module.exports = router
