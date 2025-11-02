// backend/routes/cart.js
const express = require('express');
const router = express.Router();
const {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

// Không bắt buộc login (dùng session hoặc tạo user khi checkout)
router.post('/add', addToCart);
router.get('/', getCart); // Nếu login → lấy từ DB, không thì từ session
router.put('/item', updateCartItem);
router.delete('/item/:productId/:variant', removeFromCart);
router.delete('/clear', clearCart);

module.exports = router;