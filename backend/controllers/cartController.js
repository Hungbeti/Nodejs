// backend/controllers/cartController.js
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Lấy giỏ hàng của người dùng (đã đăng nhập).
 * Sẽ tự động tạo giỏ hàng nếu chưa có.
 * GET /api/cart
 */
exports.getCart = async (req, res) => {
  try {
    // req.user._id được cung cấp bởi middleware 'protect'
    let cart = await Cart.findOne({ user: req.user._id }).populate(
      'items.product'
    );

    if (!cart) {
      // Nếu user này chưa có giỏ hàng, tạo một giỏ trống cho họ
      cart = new Cart({ user: req.user._id, items: [] });
      await cart.save();
    }

    res.json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server khi lấy giỏ hàng' });
  }
};

/**
 * Thêm sản phẩm vào giỏ hàng (đã đăng nhập).
 * POST /api/cart/add
 */
exports.addToCart = async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const userId = req.user._id;

  try {
    // 1. Kiểm tra sản phẩm có tồn tại không
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ msg: 'Không tìm thấy sản phẩm' });
    }

    // 2. Tìm giỏ hàng của người dùng
    let cart = await Cart.findOne({ user: userId });

    // 3. Nếu không có giỏ hàng, tạo giỏ hàng mới
    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [{ product: productId, quantity: quantity }],
      });
    } else {
      // 4. Nếu có giỏ hàng, kiểm tra xem sản phẩm đã tồn tại trong giỏ chưa
      const existingItem = cart.items.find(
        (item) => item.product.toString() === productId
      );

      if (existingItem) {
        // Nếu đã có, chỉ cập nhật số lượng
        existingItem.quantity += quantity;
      } else {
        // Nếu chưa có, thêm vào mảng items
        cart.items.push({ product: productId, quantity: quantity });
      }
    }

    // 5. LƯU LẠI GIỎ HÀNG VÀO DATABASE
    await cart.save();

    // 6. Trả về giỏ hàng đã populate để cập nhật UI
    const populatedCart = await Cart.findById(cart._id).populate(
      'items.product'
    );
    res.status(200).json(populatedCart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server khi thêm vào giỏ hàng' });
  }
};

/**
 * Cập nhật số lượng sản phẩm
 * PUT /api/cart/update
 */
exports.updateCartItem = async (req, res) => {
  const { productId, quantity } = req.body;

  // Số lượng phải lớn hơn 0
  if (quantity < 1) {
    // Nếu số lượng < 1, hãy coi như đây là một yêu cầu xóa
    const newReq = { ...req, params: { id: productId } };
    return exports.removeFromCart(newReq, res);
  }

  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart)
      return res.status(404).json({ msg: 'Không tìm thấy giỏ hàng' });

    const item = cart.items.find(
      (item) => item.product.toString() === productId
    );
    if (item) {
      item.quantity = quantity;
      await cart.save();
      const populatedCart = await Cart.findById(cart._id).populate(
        'items.product'
      );
      res.json(populatedCart);
    } else {
      res.status(404).json({ msg: 'Không tìm thấy sản phẩm trong giỏ' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
};

/**
 * Xóa sản phẩm khỏi giỏ hàng
 * DELETE /api/cart/remove/:id
 */
exports.removeFromCart = async (req, res) => {
  // Lấy ID sản phẩm từ params, khớp với frontend
  const productId = req.params.id;

  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart)
      return res.status(404).json({ msg: 'Không tìm thấy giỏ hàng' });

    // Lọc ra sản phẩm cần xóa
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();
    const populatedCart = await Cart.findById(cart._id).populate(
      'items.product'
    );
    res.json(populatedCart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
};

/**
 * Xóa sạch giỏ hàng
 * DELETE /api/cart/clear
 */
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
      res.json(cart);
    } else {
      res.status(404).json({ msg: 'Không tìm thấy giỏ hàng' });
    }
  } catch (err)
 {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
};

/**
 * KIỂM TRA TỒN KHO TRƯỚC KHI THANH TOÁN
 * POST /api/cart/check-stock
 * Tuyến này không 'protect' vì nó phải xử lý cả khách
 */
exports.checkStock = async (req, res) => {
  const { items: cartItems } = req.body;  // Luôn lấy từ body (selectedItems từ frontend)

  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ msg: 'Không có sản phẩm để kiểm tra' });
  }

  try {
    for (const item of cartItems) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(400).json({ msg: `Sản phẩm với ID ${item.product} không tồn tại` });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          msg: `Sản phẩm "${product.name}" không đủ hàng (chỉ còn ${product.stock} sản phẩm).` 
        });
      }
    }

    res.status(200).json({ success: true, msg: 'Tất cả sản phẩm đều đủ hàng' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server khi kiểm tra kho' });
  }
};