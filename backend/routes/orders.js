// backend/routes/orders.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken'); // Cần cho việc xác thực token thủ công

// === CẤU HÌNH NODEMAILER ===
// (Sử dụng biến môi trường .env của bạn)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * HÀM GỬI EMAIL (Helper)
 * @param {string} to - Email người nhận
 * @param {string} subject - Chủ đề
 * @param {string} html - Nội dung HTML
 */
const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: '"PC Shop" <no-reply@pcshop.com>',
      to: to,
      subject: subject,
      html: html
    });
  } catch (emailErr) {
    console.error(`Lỗi gửi email đến ${to}:`, emailErr);
  }
};

// === CÁC TUYẾN ĐƯỜNG CỦA ADMIN (Yêu cầu Admin) ===

// GET: Lấy tất cả đơn hàng (admin)
router.get('/', protect, admin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20; // Yêu cầu 20 mục/trang
    const skip = (page - 1) * limit;

    const { range, start, end } = req.query;
    let dateFilter = {};
    const now = new Date();

    // Logic lọc theo khoảng thời gian
    if (range === 'today') {
      const today = new Date(now.setHours(0, 0, 0, 0));
      dateFilter = { $gte: today };
    } else if (range === 'yesterday') {
      const yesterdayStart = new Date(new Date().setDate(now.getDate() - 1)).setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(new Date().setDate(now.getDate() - 1)).setHours(23, 59, 59, 999);
      dateFilter = { $gte: new Date(yesterdayStart), $lte: new Date(yesterdayEnd) };
    } else if (range === 'week') {
      const firstDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      dateFilter = { $gte: new Date(firstDayOfWeek.setHours(0, 0, 0, 0)) };
    } else if (range === 'month') {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { $gte: firstDayOfMonth };
    } else if (range === 'custom' && start && end) {
      dateFilter = { 
        $gte: new Date(start), 
        $lte: new Date(new Date(end).setHours(23, 59, 59, 999)) 
      };
    }
    
    const query = {};
    if (Object.keys(dateFilter).length > 0) {
      query.createdAt = dateFilter; // Lọc theo trường createdAt
    }

    // Lấy đơn hàng theo query
    const orders = await Order.find(query)
      .populate('user', 'email name')
      .sort({ createdAt: -1 }) // Sắp xếp mới nhất trước
      .skip(skip)
      .limit(limit);
    
    const total = await Order.countDocuments(query);

    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// === CÁC TUYẾN ĐƯỜNG CỦA USER (Yêu cầu Đăng nhập) ===

// GET: Lấy lịch sử đơn hàng của tôi (user)
router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('_id createdAt total currentStatus'); // Chỉ lấy thông tin tóm tắt
    res.json(orders);
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// GET: Lấy chi tiết đơn hàng của tôi (user)
router.get('/my-orders/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name images price sku');
      
    if (!order) {
      return res.status(404).json({ msg: 'Không tìm thấy đơn hàng' });
    }
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ msg: 'Không có quyền truy cập' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// GET: Chi tiết đơn hàng (admin)
router.get('/:id', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'email name')
      .populate('items.product', 'name images price');
    if (!order) return res.status(404).json({ msg: 'Không tìm thấy đơn hàng' });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// === TUYẾN THANH TOÁN (Không yêu cầu đăng nhập) ===

/**
 * POST /: Tạo đơn hàng (Checkout)
 * Cho phép cả người dùng đã đăng nhập và khách (guest).
 */
router.post('/', async (req, res) => {
  
  // Dữ liệu từ body
  const { 
    shipping,           // { name, email, address }
    payment,            // "cod"
    couponCode,         // string (vd: "SALE20")
    loyaltyPointsUsed = 0, // number
    items: guestCartItems // mảng [{ productId, quantity }] - CHỈ DÀNH CHO KHÁCH
  } = req.body;

  let user = null;
  let token;

  // 1. XÁC ĐỊNH USER
  // Kiểm tra xem user đã đăng nhập chưa (bằng cách thủ công)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await User.findById(decoded._id);
    } catch (error) {
      // Token không hợp lệ, bỏ qua, coi như khách
    }
  }

  try {
    // 2. XỬ LÝ TÀI KHOẢN (Nếu là khách)
    if (!user) {
      const { email, name, address } = shipping;
      if (!email || !name || !address) {
        return res.status(400).json({ msg: 'Vui lòng điền đầy đủ thông tin giao hàng' });
      }
      
      let guest = await User.findOne({ email });
      if (!guest) {
        const tempPass = crypto.randomBytes(4).toString('hex'); // Mật khẩu 8 ký tự
        guest = new User({
          email: email,
          name: name,
          addresses: [address],
          password: tempPass, // Model 'User' sẽ tự động băm mật khẩu này
          isFirstLogin: true
        });
        await guest.save();

        // TODO HOÀN THÀNH: Gửi email mật khẩu tạm
        await sendEmail(
          email,
          'Chào mừng bạn đến PC Shop!',
          `<h3>Xin chào ${name}!</h3>
           <p>Một tài khoản đã được tạo cho bạn để theo dõi đơn hàng.</p>
           <p><strong>Email:</strong> ${email}</p>
           <p><strong>Mật khẩu tạm:</strong> <code>${tempPass}</code></p>
           <p>Vui lòng đổi mật khẩu khi đăng nhập.</p>`
        );
      }
      user = guest; // Gán user là tài khoản guest
    }

    // 3. LẤY VÀ XÁC THỰC GIỎ HÀNG
    let cartItems = [];
    let dbCart = null; // Dùng để xóa sau

    if (!user) { // Trường hợp user=null (lỗi logic, đã xử lý ở trên)
       return res.status(400).json({ msg: 'Lỗi xác thực người dùng' });
    }

    if (token) { // Nếu user đã đăng nhập, lấy giỏ hàng từ CSDL
      dbCart = await Cart.findOne({ user: user._id });
      if (!dbCart || dbCart.items.length === 0) {
        return res.status(400).json({ msg: 'Giỏ hàng trống' });
      }
      cartItems = dbCart.items; // Đây là mảng { product: ObjectId, quantity }
    } else { // Nếu là khách (hoặc user mới tạo), lấy giỏ hàng từ req.body
      if (!guestCartItems || guestCartItems.length === 0) {
        return res.status(400).json({ msg: 'Giỏ hàng trống' });
      }
      cartItems = guestCartItems.map(item => ({ product: item.productId, quantity: item.quantity }));
    }

    // 4. TÍNH TOÁN PHÍA SERVER (Quan trọng: Xác thực lại giá)
    let subtotal = 0;
    let validatedItems = []; // Mảng các sản phẩm đã xác thực

    for (const item of cartItems) {
      const product = await Product.findById(item.product);
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({ msg: `Sản phẩm "${product?.name || item.product}" không đủ hàng` });
      }
      
      subtotal += product.price * item.quantity;
      validatedItems.push({
        product: product._id,
        name: product.name,
        image: product.images[0], // Lấy ảnh đầu tiên
        price: product.price, // Dùng giá từ CSDL
        quantity: item.quantity
      });
      
      // Giảm stock (hoặc có thể đợi thanh toán thành công)
      product.stock -= item.quantity;
      await product.save();
    }

    let tax = subtotal * 0.1; // 10% VAT
    let shippingFee = 30000; // Phí cố định
    let total = subtotal + tax + shippingFee;
    let discount = 0;
    let coupon = null;

    // 5. ÁP DỤNG MÃ GIẢM GIÁ
    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode });
      // Giới hạn 10 lần sử dụng (do quản trị viên đặt)
      if (coupon && coupon.uses < coupon.maxUses) { 
        discount = total * (coupon.discount / 100); // Giả sử discount là %
        total -= discount;
      } else {
        // Không dừng lại mà chỉ thông báo mã không hợp lệ (tùy chọn)
        // return res.status(400).json({ msg: 'Mã giảm giá không hợp lệ hoặc hết lượt' });
      }
    }

    // 6. ÁP DỤNG ĐIỂM THÂN THIẾT
    let loyaltyPointsUsedNum = Number(loyaltyPointsUsed) || 0;
    if (loyaltyPointsUsedNum > 0) {
      if (user.loyaltyPoints < loyaltyPointsUsedNum) {
        return res.status(400).json({ msg: 'Điểm thân thiết không đủ' });
      }
      let valueToUse = loyaltyPointsUsedNum * 1000;
      if (valueToUse > total) {
        // Nếu điểm dùng nhiều hơn tổng tiền, chỉ dùng tối đa bằng tổng tiền
        valueToUse = total;
        // Cập nhật lại số điểm thực sự dùng (làm tròn xuống)
        loyaltyPointsUsedNum = Math.floor(valueToUse / 1000);
      }
      total -= valueToUse;
      user.loyaltyPoints -= loyaltyPointsUsedNum;
    }

    // 7. TÍNH ĐIỂM KIẾM ĐƯỢC (10% tổng tiền *sau khi* giảm giá)
    const loyaltyPointsEarned = Math.floor(total / 10000);

    // 8. TẠO ĐƠN HÀNG
    const order = new Order({
      user: user._id,
      items: validatedItems,
      shippingAddress: shipping,
      paymentMethod: payment,
      subtotal,
      tax,
      shippingFee,
      discount,
      loyaltyPointsUsed: loyaltyPointsUsedNum,
      loyaltyPointsEarned,
      total,
      currentStatus: 'pending',
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        notes: 'Đơn hàng đã được tạo'
      }]
    });
    await order.save();

    // 9. CẬP NHẬT SAU ĐẶT HÀNG
    user.loyaltyPoints += loyaltyPointsEarned; // Thêm điểm mới
    await user.save();

    if (coupon) {
      coupon.uses += 1; // Tăng số lần đã dùng
      await coupon.save();
    }

    if (dbCart) { // Xóa giỏ hàng trong CSDL nếu user đã đăng nhập
      await dbCart.deleteOne();
    }

    // 10. TODO HOÀN THÀNH: GỬI EMAIL XÁC NHẬN ĐƠN HÀNG
    const itemsHtml = validatedItems.map(item => 
      `<tr>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>${item.price.toLocaleString()}đ</td>
        <td>${(item.price * item.quantity).toLocaleString()}đ</td>
      </tr>`
    ).join('');

    await sendEmail(
      user.email,
      `Xác nhận đơn hàng #${order._id.toString().slice(-6)}`,
      `<h2>Cảm ơn ${user.name} đã đặt hàng!</h2>
       <p>Đơn hàng của bạn đã được tiếp nhận.</p>
       <p><strong>Mã đơn hàng:</strong> #${order._id.toString().slice(-6)}</p>
       <p><strong>Tổng cộng:</strong> ${total.toLocaleString()}đ</p>
       <h4>Chi tiết đơn hàng:</h4>
       <table border="1" cellpadding="5" cellspacing="0">
        <thead>
          <tr><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Tổng</th></tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
       </table>
       <p>Cảm ơn bạn đã mua sắm!</p>`
    );

    // 11. TRẢ VỀ ĐƠN HÀNG
    res.status(201).json(order);

  } catch (err) {
    console.error("Lỗi nghiêm trọng khi tạo đơn hàng:", err);
    res.status(500).json({ msg: 'Lỗi server khi tạo đơn hàng' });
  }
});

// PATCH: Cập nhật trạng thái (admin)
router.patch('/:id/status', protect, admin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ msg: 'Trạng thái không hợp lệ' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ msg: 'Không tìm thấy' });

    order.currentStatus = status;
    order.statusHistory.push({
      status: status,
      timestamp: new Date(),
      notes: 'Cập nhật bởi Admin'
    });
    
    await order.save();
    // TODO: Gửi email cho khách hàng khi trạng thái thay đổi (ví dụ: 'shipped')
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

module.exports = router;