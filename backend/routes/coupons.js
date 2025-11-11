// backend/routes/coupons.js
const express = require('express');
const router = express.Router();
const {
  getCoupons,
  createCoupon,
  deleteCoupon,
  validateCoupon,
  getAvailableCoupons
} = require('../controllers/couponController');
const { protect, admin } = require('../middleware/auth');

// PUBLIC
// Dùng POST thay vì GET để gửi kèm orderTotal một cách an toàn và chuẩn hơn
router.get('/available', getAvailableCoupons);
router.post('/validate', validateCoupon); 

// ADMIN ONLY
router.get('/', protect, admin, getCoupons);
router.post('/', protect, admin, createCoupon);
router.delete('/:id', protect, admin, deleteCoupon);

module.exports = router;