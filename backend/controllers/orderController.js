// backend/controllers/orderController.js
const Order = require('../models/Order');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const sendEmail = require('../utils/email');

// Tạo đơn hàng (hỗ trợ guest)
const createOrder = async (req, res) => {
  const { products, total, email, name, address, couponCode } = req.body;

  try {
    // Tìm hoặc tạo user (guest)
    let user = req.user;
    if (!user) {
      user = await User.findOne({ email });
      if (!user) {
        user = new User({ email, name, addresses: [address] });
        await user.save();
      }
    }

    // Xử lý mã giảm giá
    let discount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode });
      if (coupon && coupon.uses < coupon.maxUses) {
        discount = coupon.discount || 0;
        appliedCoupon = coupon;
        coupon.uses += 1;
        await coupon.save();
      }
    }

    // Tạo đơn hàng
    const newOrder = new Order({
      user: user._id,
      products: products.map(p => ({
        product: p.product,
        quantity: p.quantity,
        variant: p.variant
      })),
      total: total - discount,
      coupon: appliedCoupon?._id
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