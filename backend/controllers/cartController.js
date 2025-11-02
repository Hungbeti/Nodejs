// backend/controllers/cartController.js
let guestCart = {}; // Lưu tạm giỏ hàng guest (key: sessionId)

const addToCart = (req, res) => {
  const { productId, variant, quantity = 1 } = req.body;
  const sessionId = req.headers['x-session-id'] || 'guest';

  if (!guestCart[sessionId]) guestCart[sessionId] = [];
  const item = guestCart[sessionId].find(i => i.productId === productId && i.variant === variant);
  if (item) {
    item.quantity += quantity;
  } else {
    guestCart[sessionId].push({ productId, variant, quantity });
  }

  res.json({ cart: guestCart[sessionId] });
};

const getCart = (req, res) => {
  const sessionId = req.headers['x-session-id'] || 'guest';
  res.json({ items: guestCart[sessionId] || [], total: 0 });
};

const updateCartItem = (req, res) => {
  const { productId, variant, quantity } = req.body;
  const sessionId = req.headers['x-session-id'] || 'guest';
  if (guestCart[sessionId]) {
    const item = guestCart[sessionId].find(i => i.productId === productId && i.variant === variant);
    if (item) item.quantity = quantity;
  }
  res.json({ message: 'Updated' });
};

const removeFromCart = (req, res) => {
  const { productId, variant } = req.params;
  const sessionId = req.headers['x-session-id'] || 'guest';
  if (guestCart[sessionId]) {
    guestCart[sessionId] = guestCart[sessionId].filter(
      i => !(i.productId === productId && i.variant === variant)
    );
  }
  res.json({ message: 'Removed' });
};

const clearCart = (req, res) => {
  const sessionId = req.headers['x-session-id'] || 'guest';
  guestCart[sessionId] = [];
  res.json({ message: 'Cart cleared' });
};

// backend/controllers/cartController.js
const applyCoupon = async (req, res) => {
  const { code } = req.body;
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });

  if (!coupon || coupon.usedCount >= coupon.maxUses) {
    return res.status(400).json({ message: 'Mã giảm giá không hợp lệ hoặc đã hết lượt dùng' });
  }

  const cart = await Cart.findOne({ user: req.user?._id || null });
  cart.discount = coupon.discount;
  cart.total = cart.subtotal - coupon.discount;
  await cart.save();

  res.json(cart);
};

module.exports = { addToCart, getCart, updateCartItem, removeFromCart, clearCart };