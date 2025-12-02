// backend/routes/coupons.js
const express = require('express');
const router = express.Router();
const {
  getCoupons,
  createCoupon,
  deleteCoupon,
  validateCoupon,
  getAvailableCoupons,
  getOrdersByCoupon
} = require('../controllers/couponController');
const { protect, admin } = require('../middleware/auth');

// PUBLIC
<<<<<<< HEAD
=======
// Dùng POST thay vì GET để gửi kèm orderTotal một cách an toàn và chuẩn hơn
>>>>>>> 1b0597093518f1fd9e0f005b48ab1c6559cf8a6b
router.get('/available', getAvailableCoupons);
router.post('/validate', validateCoupon); 

// ADMIN ONLY
router.get('/', protect, admin, getCoupons);
router.post('/', protect, admin, createCoupon);
router.delete('/:id', protect, admin, deleteCoupon);
router.get('/:code/orders', protect, admin, getOrdersByCoupon);

module.exports = router;