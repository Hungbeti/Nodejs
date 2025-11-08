// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// GET: Lấy thông tin hồ sơ (profile)
router.get('/profile', protect, async (req, res) => {
  try {
    // req.user được cung cấp bởi middleware 'protect'
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'Không tìm thấy người dùng' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// PUT: Cập nhật thông tin hồ sơ (profile)
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, addresses } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, addresses },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// === API THÊM ĐỊA CHỈ ===
router.post('/profile/address', protect, async (req, res) => {
  try {
    const { fullName, phone, addressLine } = req.body;
    if (!fullName || !phone || !addressLine) {
      return res.status(400).json({ msg: 'Vui lòng điền đầy đủ thông tin' });
    }
    
    const user = await User.findById(req.user._id);
    
    // Nếu đây là địa chỉ đầu tiên, đặt làm mặc định
    const isDefault = user.addresses.length === 0;

    user.addresses.push({ fullName, phone, addressLine, isDefault });
    await user.save();
    
    res.status(201).json(user.addresses);
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// === API XÓA ĐỊA CHỈ ===
router.delete('/profile/address/:addressId', protect, async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);

    // Kéo (pull) địa chỉ có _id khớp ra khỏi mảng
    user.addresses.pull({ _id: addressId });
    
    await user.save();
    res.json(user.addresses);
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// PUT: Cập nhật mật khẩu
router.put('/profile/password', protect, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    // Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Mật khẩu cũ không đúng' });
    }

    // Cập nhật mật khẩu mới (Model 'User' sẽ tự động hash)
    user.password = newPassword;
    await user.save();
    
    res.json({ msg: 'Cập nhật mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

module.exports = router;