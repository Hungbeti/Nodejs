// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getAdvancedDashboard,
  getUsers,
  updateUser,
  banUser,
  getCoupons,
  createCoupon,
  deleteCoupon
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

// === ADMIN ONLY ===
router.get('/dashboard', protect, admin, getDashboard);
router.get('/dashboard/advanced', protect, admin, getAdvancedDashboard);

router.get('/users', protect, admin, getUsers);
router.put('/users/:id', protect, admin, updateUser);
router.post('/users/:id/ban', protect, admin, banUser);

router.get('/coupons', protect, admin, getCoupons);
router.post('/coupons', protect, admin, createCoupon);
router.delete('/coupons/:id', protect, admin, deleteCoupon);

module.exports = router;