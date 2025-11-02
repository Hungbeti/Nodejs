// backend/routes/orders.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');           // ĐÃ CÓ
const { admin } = require('../middleware/auth');    // ĐÃ CÓ

// GET: Lấy tất cả đơn hàng (admin)
router.get('/', admin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'email name')
      .populate('items.product', 'name image price')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// GET: Chi tiết đơn hàng
router.get('/:id', admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'email name')
      .populate('items.product', 'name image price');

    if (!order) return res.status(404).json({ msg: 'Không tìm thấy đơn hàng' });

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// PATCH: Cập nhật trạng thái
router.patch('/:id/status', admin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ msg: 'Trạng thái không hợp lệ' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) return res.status(404).json({ msg: 'Không tìm thấy' });

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

module.exports = router;