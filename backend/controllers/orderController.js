// backend/controllers/orderController.js
const Order = require('../models/Order');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const sendEmail = require('../utils/email');
const Product = require('../models/Product');

// Tạo đơn hàng (hỗ trợ guest)
const createOrder = async (req, res) => {
  try {
    const { 
      items,
      shippingAddress, 
      paymentMethod, 
      couponCode, 
      loyaltyPointsUsed 
    } = req.body;
    let user = req.user;
    if (!user) {
      const email = shippingAddress.email;
      user = await User.findOne({ email });
      if (!user) {
        // Tạo user mới cho khách vãng lai
        user = new User({ 
          email, 
          name: shippingAddress.name, 
          addresses: [{
             fullName: shippingAddress.name,
             phone: shippingAddress.phone,
             addressLine: shippingAddress.address,
             isDefault: true
          }],
          password: Math.random().toString(36).slice(-8) 
        });
        await user.save();
      }
    }

    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const shippingFee = 30000;
    const tax = subtotal * 0.1;

    // Xử lý mã giảm giá
    let discountAmount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      // Kiểm tra mã còn hạn và còn lượt dùng
      if (coupon && coupon.uses < coupon.maxUses) {
         // Bạn cần điều chỉnh theo logic model Coupon của bạn
         if (coupon.type === 'percent') {
            discountAmount = (subtotal * coupon.value) / 100;
         } else {
            discountAmount = coupon.value || coupon.discount || 0;
         }

         // Cập nhật coupon
         coupon.uses += 1;
         await coupon.save();
         appliedCoupon = coupon;
      }
    }

    for (const item of items) {
      const product = await Product.findById(item.product);
      
      if (product) {
        // 1. Trừ tổng tồn kho và tăng số lượng đã bán
        product.stock = Math.max(0, product.stock - item.quantity);
        product.sold = (product.sold || 0) + item.quantity;

        // 2. Trừ tồn kho của BIẾN THỂ (Nếu có)
        if (item.variantName && product.variants && product.variants.length > 0) {
           const variantIndex = product.variants.findIndex(v => v.name === item.variantName);
           if (variantIndex !== -1) {
              // Trừ kho biến thể
              product.variants[variantIndex].stock = Math.max(0, product.variants[variantIndex].stock - item.quantity);
           }
        }

        await product.save();
      }
    }

    const pointsDiscount = (loyaltyPointsUsed || 0) * 1000;
    const finalTotal = subtotal + tax + shippingFee - discountAmount - pointsDiscount;

    // Tạo đơn hàng
    const newOrder = new Order({
      user: user._id,
      items: items.map(p => ({
        product: p.product,
        name: p.name,
        price: p.price,
        quantity: p.quantity,
        variantName: p.variantName
      })),
      total: total - discount,
      coupon: appliedCoupon?._id,
      shippingAddress,
      paymentMethod,
      
      // Các trường tài chính chi tiết
      subtotal,
      tax,
      shippingFee,
      
      // ---LƯU THÔNG TIN GIẢM GIÁ VÀO DB ---
      discount: discountAmount, 
      couponCode: couponCode || null,
      // -------------------------------------------------

      loyaltyPointsUsed: loyaltyPointsUsed || 0,
      total: finalTotal,
    });

    newOrder.statusHistory.push({ status: 'pending' });
    await newOrder.save();

    // Cập nhật mã giảm giá (sau khi order được tạo)
    if (appliedCoupon) {
      appliedCoupon.orders.push(newOrder._id);
      await appliedCoupon.save();
    }

    // Cộng điểm thân thiết: 10% tổng tiền
    user.loyaltyPoints += Math.floor((total - discount) * 0.1);
    await user.save();

    // Gửi email xác nhận
    await sendEmail(email, 'Xác nhận đơn hàng', `
      Cảm ơn bạn đã mua hàng!
      Mã đơn hàng: ${newOrder._id}
      Tổng tiền: ${(total - discount).toLocaleString()} VND
      Trạng thái: Đang xử lý
    `);

    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lịch sử đơn hàng của user
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ date: -1 })
      .select('-__v');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Chi tiết đơn hàng
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
      .populate('products.product', 'name price images')
      .populate('coupon', 'code discount');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Danh sách tất cả đơn hàng (admin)
const getAllOrders = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.date.$lte = new Date(req.query.endDate);
    }

    const orders = await Order.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email');

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Cập nhật trạng thái đơn hàng (admin)
const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    order.statusHistory.push({ status, timestamp: new Date() });
    await order.save();

    res.json({ message: 'Status updated', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus
};