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
const jwt = require('jsonwebtoken');

// === CẤU HÌNH NODEMAILER ===
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * HÀM GỬI EMAIL (Helper)
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

// GET: Lấy tất cả đơn hàng (admin) (Đã có Lọc & Phân trang)
router.get('/', protect, admin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const { range, start, end } = req.query;
    let dateFilter = {};
    const now = new Date();

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
      query.createdAt = dateFilter;
    }

    const orders = await Order.find(query)
      .populate('user', 'email name')
      .sort({ createdAt: -1 })
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

// GET: Lấy lịch sử đơn hàng của tôi (user) (ĐÃ SỬA LỖI: Bỏ 'admin')
router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('_id createdAt total currentStatus');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// GET: Lấy chi tiết đơn hàng của tôi (user) (ĐÃ SỬA LỖI: Bỏ 'admin')
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

// === THÊM ROUTE MỚI: USER HỦY ĐƠN HÀNG ===
router.patch('/my-orders/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user');
    
    if (!order) {
      return res.status(404).json({ msg: 'Không tìm thấy đơn hàng' });
    }
    // 1. Xác thực chính chủ
    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(401).json({ msg: 'Không có quyền' });
    }
    
    // 2. Kiểm tra điều kiện (chỉ được hủy khi 'pending' hoặc 'processing')
    if (order.currentStatus !== 'pending' && order.currentStatus !== 'processing') {
      return res.status(400).json({ 
        msg: `Không thể hủy đơn hàng ở trạng thái "${order.currentStatus}"` 
      });
    }

    // --- Logic Hoàn tác (Quan trọng) ---
    // 3. Hoàn trả lại hàng vào kho và giảm số lượng đã bán
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { 
          stock: item.quantity,    // Trả lại hàng
          sold: -item.quantity   // Giảm số đã bán
        }
      });
    }
    
    // 4. Hoàn trả lại điểm thân thiết (nếu có)
    const user = order.user; // Đã populate ở trên
    user.loyaltyPoints -= order.loyaltyPointsEarned; // Bỏ điểm đã kiếm
    user.loyaltyPoints += order.loyaltyPointsUsed; // Trả lại điểm đã dùng
    await user.save();
    
    // 5. Cập nhật trạng thái đơn hàng
    order.currentStatus = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      notes: 'Hủy bởi người dùng'
    });
    await order.save();
    
    res.json(order); // Trả về đơn hàng đã cập nhật
  } catch (err) {
    console.error("Lỗi khi hủy đơn hàng:", err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// GET: Chi tiết đơn hàng (admin) (Đặt SAU route /my-orders/:id)
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
 */
router.post('/', async (req, res) => {
  
  const { 
    shipping,
    payment,
    couponCode,
    loyaltyPointsUsed = 0,
    items: guestCartItems
  } = req.body;

  let user = null;
  let token;
  let coupon = null;

  try {

    const shipping = req.body.shippingAddress;
    if (!shipping || !shipping.name || !shipping.address) {
      return res.status(400).json({ msg: 'Thông tin giao hàng không hợp lệ hoặc thiếu' });
    }
    // 1. XÁC ĐỊNH USER
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = await User.findById(decoded._id);
      } catch (error) { /* Bỏ qua, coi như khách */ }
    }

    // 2. XỬ LÝ TÀI KHOẢN (Nếu là khách)
    if (!user) {
      const { email, name, phone, address, addressLine } = shipping; 
      
      // Xác định địa chỉ thực tế (ưu tiên cái nào có dữ liệu)
      const finalAddress = address || addressLine;
      if (!email || !name || !finalAddress) {
        return res.status(400).json({ msg: 'Vui lòng điền đầy đủ thông tin giao hàng' });
      }
      
      let guest = await User.findOne({ email });  
      if (!guest) {
        const tempPass = crypto.randomBytes(4).toString('hex');
        guest = new User({
          email: email,
          name: name,
          addresses: [{ // Sử dụng cấu trúc địa chỉ mới
            fullName: name,
            phone: phone || '',
            addressLine: finalAddress,
            isDefault: true
          }],
          password: tempPass,
          isFirstLogin: true
        });
        await guest.save();
        
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
      user = guest;
    }

    // 3. LẤY VÀ XÁC THỰC GIỎ HÀNG (luôn dùng từ body, không lấy full cart)
    const { items: bodyItems } = req.body;
    if (!bodyItems || bodyItems.length === 0) {
      return res.status(400).json({ msg: 'Giỏ hàng trống' });
    }

    // Chuyển bodyItems sang format { product: _id, quantity }
    let cartItems = bodyItems.map(item => ({
      product: item.product,
      quantity: item.quantity,
      variantName: item.variantName, // <-- Lấy từ request
      variantId: item.variantId
    }));

    // 4. TÍNH TOÁN PHÍA SERVER VÀ CẬP NHẬT `sold`
    let subtotal = 0;
    let validatedItems = []; 

    for (const item of cartItems) {
      const product = await Product.findById(item.product);
<<<<<<< HEAD
      
      // Kiểm tra sản phẩm tồn tại
      if (!product) {
        return res.status(400).json({ msg: `Sản phẩm không tồn tại` });
      }

      // --- 1. LOGIC TÍNH GIÁ & TÌM BIẾN THỂ ---
      let itemPrice = product.price;
      let itemName = product.name;
      let selectedVariant = null; // Biến tạm để lưu biến thể đã chọn

      // Nếu item có variantId, tìm biến thể đó để lấy giá
      if (item.variantId && product.variants && product.variants.length > 0) {
          selectedVariant = product.variants.id(item.variantId);
          
          if (selectedVariant) {
              itemPrice = selectedVariant.price;
              // Kiểm tra tồn kho của RIÊNG biến thể này
              if (selectedVariant.stock < item.quantity) {
                  return res.status(400).json({ 
                      msg: `Phiên bản "${selectedVariant.name}" của sản phẩm "${product.name}" không đủ hàng (chỉ còn ${selectedVariant.stock})` 
                  });
              }
          }
      } 
      
      // Kiểm tra tồn kho tổng (Fallback)
      if (product.stock < item.quantity) {
        return res.status(400).json({ msg: `Sản phẩm "${product.name}" không đủ hàng` });
      }

=======
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({ msg: `Sản phẩm "${product?.name || item.product}" không đủ hàng` });
      }

      let itemPrice = product.price;
      let itemName = product.name;

      if (item.variantId && product.variants) {
          const variant = product.variants.id(item.variantId);
          if (variant) {
              itemPrice = variant.price;
              // Tùy chọn: Có thể nối tên variant vào tên SP hoặc lưu riêng
              // itemName = `${product.name} (${variant.name})`; 
          }
      } else if (item.price) {
          // Fallback: nếu frontend gửi price đúng (đã validate ở bước khác), dùng tạm
          // Nhưng tốt nhất là query DB như trên để bảo mật giá
          itemPrice = item.price; 
      }
      
>>>>>>> 1b0597093518f1fd9e0f005b48ab1c6559cf8a6b
      subtotal += itemPrice * item.quantity;
      
      validatedItems.push({
        product: product._id,
<<<<<<< HEAD
        name: itemName,
        image: product.images[0],
        price: itemPrice,
        quantity: item.quantity,
        variantName: item.variantName,
        category: product.category 
      });
      
      // --- 2. LOGIC TRỪ TỒN KHO (ĐÃ SỬA) ---
      
      // A. Trừ kho của BIẾN THỂ (Quan trọng)
      if (selectedVariant) {
          selectedVariant.stock -= item.quantity;
      }

      // B. Trừ kho TỔNG và tăng số lượng đã bán
      product.stock -= item.quantity;
      product.sold = (product.sold || 0) + item.quantity;
      
=======
        name: itemName, // Tên sản phẩm
        image: product.images[0],
        price: itemPrice, // GIÁ CỦA BIẾN THỂ (đã tính toán ở trên)
        quantity: item.quantity,
        variantName: item.variantName // LƯU TÊN BIẾN THỂ VÀO DB
      });
      
      // === CẬP NHẬT TỒN KHO VÀ SỐ LƯỢNG ĐÃ BÁN ===
      product.stock -= item.quantity;
      product.sold = (product.sold || 0) + item.quantity;
>>>>>>> 1b0597093518f1fd9e0f005b48ab1c6559cf8a6b
      await product.save();
    }

    let tax = subtotal * 0.1;
    let shippingFee = 30000;
    let total = subtotal + tax + shippingFee;
    let discount = 0;
    let coupon = null;

    // 5. ÁP DỤNG MÃ GIẢM GIÁ (Logic này cần được đồng bộ với /coupons/validate)
    if (couponCode) {
<<<<<<< HEAD
      coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      
=======
      coupon = await Coupon.findOne({ code: couponCode, isActive: true });
>>>>>>> 1b0597093518f1fd9e0f005b48ab1c6559cf8a6b
      if (coupon && coupon.uses < coupon.maxUses && subtotal >= coupon.minOrderValue) {
        
        // Kiểm tra logic danh mục
        let applicableTotal = subtotal;
<<<<<<< HEAD

        if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
          
          // Lọc ra những sản phẩm nào nằm trong danh mục được khuyến mãi
          const applicableItems = validatedItems.filter(item => {
            // item.category là ObjectId, cần chuyển toString() để so sánh
            return item.category && coupon.applicableCategories.map(c => c.toString()).includes(item.category.toString());
          });

          if (applicableItems.length === 0) {
             // Nếu mã này giới hạn danh mục mà không có sản phẩm nào khớp -> Không giảm
             applicableTotal = 0; 
          } else {
             // Tính tổng tiền của chỉ những sản phẩm được áp dụng
             applicableTotal = applicableItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          }
        }

        // Tính giảm giá (Chỉ tính nếu applicableTotal > 0)
        if (applicableTotal > 0) {
            if (coupon.type === 'percent') {
              discount = Math.floor(applicableTotal * (coupon.value / 100));
            } else {
              discount = coupon.value;
            }
            // Không giảm quá tổng tiền áp dụng
            discount = Math.min(discount, applicableTotal);
            total -= discount;
        } else {
            // Mã hợp lệ nhưng không áp dụng cho sản phẩm nào trong giỏ
            coupon = null; 
        }

=======
        if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
          const applicableItems = validatedItems.filter(item => {
            const product = cartItems.find(p => p.product.toString() === item.product.toString());
            return product && coupon.applicableCategories.includes(product.category); // Giả định item có category
          });
          applicableTotal = applicableItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        }

        // Tính giảm giá
        if (coupon.type === 'percent') {
          discount = Math.floor(applicableTotal * (coupon.value / 100));
        } else {
          discount = coupon.value;
        }
        discount = Math.min(discount, applicableTotal);
        total -= discount;
>>>>>>> 1b0597093518f1fd9e0f005b48ab1c6559cf8a6b
      } else {
         coupon = null;
      }
    }

    // 6. ÁP DỤNG ĐIỂM THÂN THIẾT
    let loyaltyPointsUsedNum = Number(loyaltyPointsUsed) || 0;
    if (loyaltyPointsUsedNum > 0) {
      if (user.loyaltyPoints < loyaltyPointsUsedNum) {
        return res.status(400).json({ msg: 'Điểm thân thiết không đủ' });
      }
      let valueToUse = loyaltyPointsUsedNum * 1000; // 1 điểm = 1000đ
      if (valueToUse > total) {
        valueToUse = total;
        loyaltyPointsUsedNum = Math.floor(valueToUse / 1000);
      }
      total -= valueToUse;
      user.loyaltyPoints -= loyaltyPointsUsedNum;
    }

    // 7. TÍNH ĐIỂM KIẾM ĐƯỢC (1 điểm = 10.000đ)
    const loyaltyPointsEarned = Math.floor(total / 10000);

    // 8. TẠO ĐƠN HÀNG
    const order = new Order({
      user: user._id,
      items: validatedItems,
      shippingAddress: {
        name: shipping.name,
        email: shipping.email,
        phone: shipping.phone || '', // Đảm bảo phone tồn tại
        address: shipping.address || shipping.addressLine || '' // Ánh xạ từ 'addressLine'
      }, // Dùng shipping address từ form
      paymentMethod: payment,
      subtotal,
      tax,
      shippingFee,
      discount,
      couponCode: coupon ? coupon.code : undefined,
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
    user.loyaltyPoints += loyaltyPointsEarned;
    await user.save();

    if (coupon) {
      coupon.uses += 1;
      await coupon.save();
    }

    // XÓA CHỈ CÁC SẢN PHẨM ĐÃ CHỌN KHỎI GIỎ HÀNG (nếu đăng nhập)
    if (token) {
      try {
        const cart = await Cart.findOne({ user: user._id });
        if (cart) {
          const orderedProductIds = validatedItems.map(item => item.product.toString());
          cart.items = cart.items.filter(
            item => !orderedProductIds.includes(item.product.toString())
          );
          await cart.save();
        }
      } catch (err) {
        console.error('Lỗi khi xóa sản phẩm khỏi giỏ hàng:', err);
      }
    }

    // 10. GỬI EMAIL XÁC NHẬN
    const loyaltyDiscount = loyaltyPointsUsedNum * 1000;
    const itemsHtml = validatedItems.map(item => 
      `<tr>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
            <img src="${item.image}" alt="sp" width="50" height="50" style="object-fit: cover; border-radius: 4px;" />
        </td>
        <td style="padding: 8px; border: 1px solid #ddd;">
            <strong>${item.name}</strong>
            ${item.variantName ? `<br/><small style="color: #666;">Phân loại: ${item.variantName}</small>` : ''} 
        </td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.price.toLocaleString()}đ</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${(item.price * item.quantity).toLocaleString()}đ</td>
      </tr>`
    ).join('');

    // Tạo HTML cho các phần giảm giá (chỉ hiện nếu có)
    let discountRows = '';
    if (discount > 0) {
        discountRows += `<p style="margin: 5px 0;">Giảm giá Voucher: <span style="color: green;">-${discount.toLocaleString()}đ</span></p>`;
    }
    if (loyaltyDiscount > 0) {
        discountRows += `<p style="margin: 5px 0;">Điểm thân thiết: <span style="color: green;">-${loyaltyDiscount.toLocaleString()}đ</span></p>`;
    }

    // Nội dung email hoàn chỉnh
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #0d6efd;">Cảm ơn ${user.name} đã đặt hàng!</h2>
        <p>Đơn hàng của bạn đã được tiếp nhận và đang được xử lý.</p>
        <p><strong>Mã đơn hàng:</strong> #${order._id.toString().slice(-6)}</p>

        <h4 style="border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 20px;">Chi tiết đơn hàng:</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 10px; border: 1px solid #ddd;">Ảnh</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Sản phẩm</th>
              <th style="padding: 10px; border: 1px solid #ddd;">SL</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Đơn giá</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div style="margin-top: 20px; text-align: right;">
           <p style="margin: 5px 0;">Tổng tiền hàng: <strong>${subtotal.toLocaleString()}đ</strong></p>
           <p style="margin: 5px 0;">Phí vận chuyển: <strong>+${shippingFee.toLocaleString()}đ</strong></p>
           <p style="margin: 5px 0;">Thuế (10%): <strong>+${tax.toLocaleString()}đ</strong></p>
           ${discountRows}
           <hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;" />
           <h3 style="color: #d63384; margin: 10px 0;">Tổng thanh toán: ${total.toLocaleString()}đ</h3>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
          Cảm ơn bạn đã mua sắm tại PC Shop!<br/>
          Đây là email tự động, vui lòng không trả lời.
        </p>
      </div>
    `;

    await sendEmail(
      user.email,
      `Xác nhận đơn hàng #${order._id.toString().slice(-6)}`,
      emailContent
    );

    // 11. TRẢ VỀ ĐƠN HÀNG
    res.status(201).json(order);

  } catch (err) {
    console.error("Lỗi nghiêm trọng khi tạo đơn hàng:", err);
    res.status(500).json({ msg: 'Lỗi server khi tạo đơn hàng' });
  }
});

router.post('/users/check-email', async (req, res) => {
  const { email } = req.body;
  const exists = await User.exists({ email });
  res.json({ exists });
});

router.post('/users/check-phone', async (req, res) => {
  const { phone } = req.body;
  const exists = await User.exists({ 'addresses.phone': phone });
  res.json({ exists });
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

    if (order.currentStatus === 'cancelled' || order.currentStatus === 'delivered') {
      return res.status(400).json({ 
        msg: `Không thể cập nhật trạng thái cho đơn hàng đã "${order.currentStatus}"` 
      });
    }

    order.currentStatus = status;
    order.statusHistory.push({
      status: status,
      timestamp: new Date(),
      notes: 'Cập nhật bởi Admin'
    });
    
    await order.save();
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

module.exports = router;