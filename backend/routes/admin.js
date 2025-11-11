// backend/routes/admin.js
const express = require('express');
const User = require('../models/User');
const router = express.Router();
const {
  getDashboard,
  getAdvancedDashboard,
  getUsers,
  updateUser,
  toggleUserBan,
  getCoupons,
  createCoupon,
  deleteCoupon
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

// === ADMIN ONLY ===
router.get('/dashboard', protect, admin, getDashboard);
router.get('/dashboard/advanced', protect, admin, getAdvancedDashboard);

// GET /admin/users - ĐÃ CẬP NHẬT
router.get('/users', protect, admin, getUsers);

// BAN / UNBAN - ĐÃ CẬP NHẬT
router.put('/users/:id/ban', protect, admin, toggleUserBan);

// UPDATE USER - ĐÃ CẬP NHẬT
router.put('/users/:id', protect, admin, updateUser);

router.get('/coupons', protect, admin, getCoupons);
router.post('/coupons', protect, admin, createCoupon);
router.delete('/coupons/:id', protect, admin, deleteCoupon);

module.exports = router;