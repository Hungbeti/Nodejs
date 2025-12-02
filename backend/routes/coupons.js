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
router.get('/available', getAvailableCoupons);
router.post('/validate', validateCoupon); 

// ADMIN ONLY
router.get('/', protect, admin, getCoupons);
router.post('/', protect, admin, createCoupon);
router.delete('/:id', protect, admin, deleteCoupon);
router.get('/:code/orders', protect, admin, getOrdersByCoupon);

module.exports = router;