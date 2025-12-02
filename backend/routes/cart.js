// backend/routes/cart.js
const express = require('express');
const router = express.Router();
const {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  checkStock
} = require('../controllers/cartController');

// IMPORT MIDDLEWARE XÁC THỰC
const { protect } = require('../middleware/auth');

// === THÊM 'protect' VÀO TẤT CẢ CÁC TUYẾN ===
// (Điều này là BẮT BUỘC để giỏ hàng của người dùng đã đăng nhập hoạt động)

// POST /api/cart/add
router.post('/add', protect, addToCart);

// GET /api/cart
router.get('/', protect, getCart);

// PUT /api/cart/update (Khớp với Cart.js)
router.put('/update', protect, updateCartItem);

// DELETE /api/cart/remove/:id (Khớp với Cart.js)
router.delete('/remove/:id', protect, removeFromCart);

// DELETE /api/cart/clear
router.delete('/clear', protect, clearCart);

router.post('/check-stock', checkStock);

module.exports = router;