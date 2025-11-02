// backend/controllers/adminController.js
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');

// Dashboard tổng quan
const getDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const revenueResult = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const revenue = revenueResult[0]?.total || 0;

    const topProducts = await Order.aggregate([
      { $unwind: '$products' },
      { $group: { _id: '$products.product', count: { $sum: '$products.quantity' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      { $project: { name: '$product.name', sold: '$count' } }
    ]);

    res.json({ totalUsers, totalOrders, revenue, topProducts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Dashboard nâng cao (theo thời gian)
const getAdvancedDashboard = async (req, res) => {
  const { period = 'year', start, end } = req.query;
  let dateFilter = {};

  const now = new Date();
  if (period === 'year') {
    dateFilter = { $gte: new Date(now.getFullYear(), 0, 1) };
  } else if (period === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    dateFilter = { $gte: new Date(now.getFullYear(), quarter * 3, 1) };
  } else if (period === 'month') {
    dateFilter = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  } else if (period === 'week') {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    dateFilter = { $gte: weekStart };
  } else if (start && end) {
    dateFilter = { $gte: new Date(start), $lte: new Date(end) };
  }

  try {
    const orders = await Order.find({ date: dateFilter });
    const revenue = orders.reduce((sum, o) => sum + o.total, 0);
    const profit = revenue * 0.3; // giả định lợi nhuận 30%

    res.json({ period, orders: orders.length, revenue, profit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Quản lý người dùng
const getUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  try {
    const users = await User.find().select('-password').skip((page - 1) * limit).limit(limit);
    const total = await User.countDocuments();
    res.json({ users, totalPages: Math.ceil(total / limit), currentPage: page });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const banUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isBanned: true });
    res.json({ message: 'User banned' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Quản lý mã giảm giá
const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createCoupon = async (req, res) => {
  const { code, discount, maxUses = 10 } = req.body;
  if (!/^[A-Z0-9]{5}$/.test(code)) {
    return res.status(400).json({ message: 'Code must be 5 alphanumeric characters' });
  }
  try {
    const coupon = new Coupon({ code, discount, maxUses });
    await coupon.save();
    res.status(201).json(coupon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const revenueResult = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const revenue = revenueResult[0]?.total || 0;

    res.json({ totalUsers, totalOrders, revenue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Export đúng
module.exports = {
  getDashboard,
  getAdvancedDashboard,
  getUsers,
  updateUser,
  banUser,
  getCoupons,
  createCoupon,
  deleteCoupon,
  getStats
};