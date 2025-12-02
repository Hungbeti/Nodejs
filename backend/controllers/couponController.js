// backend/controllers/couponController.js
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
<<<<<<< HEAD
const Product = require('../models/Product');
=======
>>>>>>> 1b0597093518f1fd9e0f005b48ab1c6559cf8a6b

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
<<<<<<< HEAD

// POST: Kiểm tra mã giảm giá
const validateCoupon = async (req, res) => {
=======
// POST: Kiểm tra mã giảm giá (Cần biết tổng tiền để check điều kiện)
const validateCoupon = async (req, res) => {
  // Cần nhận thêm 'cartItems' để kiểm tra danh mục sản phẩm
>>>>>>> 1b0597093518f1fd9e0f005b48ab1c6559cf8a6b
  const { code, orderTotal, cartItems } = req.body;

  try {
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) return res.status(404).json({ valid: false, msg: 'Mã không tồn tại' });
    if (coupon.uses >= coupon.maxUses) return res.status(400).json({ valid: false, msg: 'Mã hết lượt dùng' });
    if (orderTotal < coupon.minOrderValue) return res.status(400).json({ valid: false, msg: `Đơn tối thiểu ${coupon.minOrderValue.toLocaleString()}đ` });

<<<<<<< HEAD
    // --- SỬA LOGIC KIỂM TRA DANH MỤC (Backend tự tra cứu DB) ---
    let applicableTotal = orderTotal; 

    // Nếu mã có giới hạn danh mục
    if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
      
      // 1. Lấy danh sách ID sản phẩm từ giỏ hàng gửi lên
      const productIds = cartItems.map(item => item.product);

      // 2. Tìm thông tin sản phẩm (để lấy category thật từ DB)
      const dbProducts = await Product.find({ _id: { $in: productIds } }).select('_id category');
      
      // 3. Tạo Map để tra cứu nhanh: { "productId": "categoryId" }
      const productCategoryMap = {};
      dbProducts.forEach(p => {
        productCategoryMap[p._id.toString()] = p.category ? p.category.toString() : null;
      });

      // 4. Lọc các item trong giỏ khớp với danh mục khuyến mãi
      // Lưu ý: coupon.applicableCategories là mảng ObjectId, cần so sánh dạng String
      const validCategoryIds = coupon.applicableCategories.map(id => id.toString());

      const applicableItems = cartItems.filter(item => {
        const realCategoryId = productCategoryMap[item.product]; // Lấy category từ DB Map
        return realCategoryId && validCategoryIds.includes(realCategoryId);
      });
=======
    // --- LOGIC MỚI: KIỂM TRA DANH MỤC ---
    let applicableTotal = orderTotal; // Mặc định là tổng đơn

    // Nếu mã chỉ áp dụng cho một số danh mục cụ thể
    if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
      // Lọc ra các sản phẩm thuộc danh mục được áp dụng
      const applicableItems = cartItems.filter(item => 
        // Giả sử item.product.category là ID danh mục
        coupon.applicableCategories.includes(item.product.category)
      );
>>>>>>> 1b0597093518f1fd9e0f005b48ab1c6559cf8a6b

      if (applicableItems.length === 0) {
        return res.status(400).json({ 
          valid: false, 
          msg: 'Mã này không áp dụng cho các sản phẩm trong giỏ hàng của bạn' 
        });
      }

<<<<<<< HEAD
      // 5. Tính tổng tiền của CHỈ các sản phẩm được áp dụng
      // Dùng giá từ Frontend gửi lên (vì có thể là giá biến thể)
      applicableTotal = applicableItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
    // -----------------------------------------------------------

    // Tính toán tiền giảm
=======
      // Tính tổng tiền của CHỈ các sản phẩm được áp dụng
      applicableTotal = applicableItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    }
    // ------------------------------------

    // Tính toán tiền giảm dựa trên 'applicableTotal'
>>>>>>> 1b0597093518f1fd9e0f005b48ab1c6559cf8a6b
    let discountAmount = 0;
    if (coupon.type === 'percent') {
      discountAmount = Math.floor(applicableTotal * (coupon.value / 100));
    } else {
      discountAmount = coupon.value;
    }
<<<<<<< HEAD
    
    // Đảm bảo không giảm quá số tiền của các sản phẩm hợp lệ
    discountAmount = Math.min(discountAmount, applicableTotal); 
=======
    discountAmount = Math.min(discountAmount, applicableTotal); // Không giảm quá tổng tiền áp dụng
>>>>>>> 1b0597093518f1fd9e0f005b48ab1c6559cf8a6b

    res.json({
      valid: true,
      couponCode: coupon.code,
      discountAmount: discountAmount,
      msg: 'Áp dụng thành công!'
    });

  } catch (err) {
<<<<<<< HEAD
    console.error("Lỗi validate coupon:", err);
=======
    console.error(err);
>>>>>>> 1b0597093518f1fd9e0f005b48ab1c6559cf8a6b
    res.status(500).json({ msg: 'Lỗi kiểm tra mã' });
  }
};

const getOrdersByCoupon = async (req, res) => {
  try {
    const { code } = req.params;
    const orders = await Order.find({ couponCode: code.toUpperCase() })
      .populate('user', 'name email')
      .select('_id createdAt total currentStatus user')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
};

module.exports = {
  getCoupons,
  createCoupon,
  deleteCoupon,
  validateCoupon,
  getAvailableCoupons,
  getOrdersByCoupon
};