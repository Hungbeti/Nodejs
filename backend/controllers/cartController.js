// backend/controllers/cartController.js
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// GET: Lấy giỏ hàng
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
      await cart.save();
    }
    res.json(cart);
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
};

// POST: Thêm vào giỏ
exports.addToCart = async (req, res) => {
  // Nhận thêm variantId, variantName, price từ Frontend gửi lên
  const { productId, quantity = 1, variantId, variantName, price } = req.body;
  const userId = req.user._id;

  try {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // 1. Tìm xem sản phẩm VỚI BIẾN THỂ ĐÓ đã có trong giỏ chưa
    const existingItemIndex = cart.items.findIndex(item => 
      item.product.toString() === productId && item.variantId === variantId
    );

    if (existingItemIndex > -1) {
      // Nếu đã có đúng biến thể đó -> Tăng số lượng
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Nếu chưa có -> Thêm mới với thông tin biến thể và giá riêng
      cart.items.push({ 
        product: productId, 
        quantity, 
        variantId, 
        variantName,
        price: price // Quan trọng: Lưu giá của biến thể
      });
    }

    await cart.save();
    const populatedCart = await Cart.findById(cart._id).populate('items.product');
    res.status(200).json(populatedCart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
};

// PUT: Cập nhật số lượng
exports.updateCartItem = async (req, res) => {
  // Frontend cần gửi itemId (cartItem._id) thay vì productId
  const { itemId, quantity } = req.body; 

  if (quantity < 1) {
     // Gọi hàm xóa nếu số lượng < 1
     req.params.id = itemId; 
     return exports.removeFromCart(req, res);
  }

  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ msg: 'Không tìm thấy giỏ' });

    // Tìm item theo ID của dòng trong giỏ (Unique cho từng biến thể)
    const item = cart.items.id(itemId); 
    
    if (item) {
      item.quantity = quantity;
      await cart.save();
      const populatedCart = await Cart.findById(cart._id).populate('items.product');
      res.json(populatedCart);
    } else {
      res.status(404).json({ msg: 'Không tìm thấy sản phẩm' });
    }
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
};

// DELETE: Xóa sản phẩm (Dùng Item ID)
exports.removeFromCart = async (req, res) => {
  const itemId = req.params.id; // Đây là cartItem._id

  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ msg: 'Không tìm thấy giỏ' });

    // Xóa item theo ID
    cart.items.pull({ _id: itemId });

    await cart.save();
    const populatedCart = await Cart.findById(cart._id).populate('items.product');
    res.json(populatedCart);
  } catch (err) {
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