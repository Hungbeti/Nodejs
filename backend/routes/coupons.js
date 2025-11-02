// backend/routes/coupons.js
const express = require('express');
const router = express.Router();
const {
  validateCoupon,
  applyCoupon
} = require('../controllers/couponController');

// === PUBLIC ===
router.get('/validate/:code', validateCoupon);   // Kiểm tra hợp lệ + số lần dùng
router.post('/apply', applyCoupon);             // Áp dụng khi checkout

module.exports = router;