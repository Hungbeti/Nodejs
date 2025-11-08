// backend/controllers/couponController.js
const Coupon = require('../models/Coupon');

// === ADMIN ONLY ===

// GET: Lấy danh sách Coupon
const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find()
      .populate('applicableCategories', 'name') // Lấy tên danh mục
      .sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
};

// POST: Tạo Coupon mới
const createCoupon = async (req, res) => {
  try {
    // Lấy thêm 'applicableCategories' từ req.body
    const { code, type, value, minOrderValue, maxUses, applicableCategories } = req.body;

    const exists = await Coupon.findOne({ code: code.toUpperCase() });
    if (exists) {
      return res.status(400).json({ msg: 'Mã này đã tồn tại' });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      type,
      value,
      minOrderValue: minOrderValue || 0,
      maxUses: Math.min(maxUses || 10, 10),
      applicableCategories: applicableCategories || [] // Mặc định là [] (Tất cả)
    });

    await coupon.save();
    res.status(201).json(coupon);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ msg: messages.join(', ') });
    }
    res.status(500).json({ msg: 'Lỗi server' });
  }
};

// DELETE: Xóa Coupon
const deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Đã xóa mã giảm giá' });
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
};

// === PUBLIC (USER) ===
const getAvailableCoupons = async (req, res) => {
  try {
    // Chỉ lấy các mã đang active và còn lượt dùng
    const coupons = await Coupon.find({ 
      isActive: true,
      $expr: { $lt: ["$uses", "$maxUses"] } // uses < maxUses
    })
    .populate('applicableCategories', 'name')
    .select('-createdAt -updatedAt -__v'); // Ẩn các trường không cần thiết
    
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
};
// POST: Kiểm tra mã giảm giá (Cần biết tổng tiền để check điều kiện)
const validateCoupon = async (req, res) => {
  // Cần nhận thêm 'cartItems' để kiểm tra danh mục sản phẩm
  const { code, orderTotal, cartItems } = req.body;

  try {
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) return res.status(404).json({ valid: false, msg: 'Mã không tồn tại' });
    if (coupon.uses >= coupon.maxUses) return res.status(400).json({ valid: false, msg: 'Mã hết lượt dùng' });
    if (orderTotal < coupon.minOrderValue) return res.status(400).json({ valid: false, msg: `Đơn tối thiểu ${coupon.minOrderValue.toLocaleString()}đ` });

    // --- LOGIC MỚI: KIỂM TRA DANH MỤC ---
    let applicableTotal = orderTotal; // Mặc định là tổng đơn

    // Nếu mã chỉ áp dụng cho một số danh mục cụ thể
    if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
      // Lọc ra các sản phẩm thuộc danh mục được áp dụng
      const applicableItems = cartItems.filter(item => 
        // Giả sử item.product.category là ID danh mục
        coupon.applicableCategories.includes(item.product.category)
      );

      if (applicableItems.length === 0) {
        return res.status(400).json({ 
          valid: false, 
          msg: 'Mã này không áp dụng cho các sản phẩm trong giỏ hàng của bạn' 
        });
      }

      // Tính tổng tiền của CHỈ các sản phẩm được áp dụng
      applicableTotal = applicableItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    }
    // ------------------------------------

    // Tính toán tiền giảm dựa trên 'applicableTotal'
    let discountAmount = 0;
    if (coupon.type === 'percent') {
      discountAmount = Math.floor(applicableTotal * (coupon.value / 100));
    } else {
      discountAmount = coupon.value;
    }
    discountAmount = Math.min(discountAmount, applicableTotal); // Không giảm quá tổng tiền áp dụng

    res.json({
      valid: true,
      couponCode: coupon.code,
      discountAmount: discountAmount,
      msg: 'Áp dụng thành công!'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi kiểm tra mã' });
  }
};

module.exports = {
  getCoupons,
  createCoupon,
  deleteCoupon,
  validateCoupon,
  getAvailableCoupons
};