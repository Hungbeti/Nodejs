// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// GET: Lấy thông tin hồ sơ
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .lean(); // .lean() để tăng tốc

    if (!user) {
      return res.status(404).json({ msg: 'Không tìm thấy người dùng' });
    }
    res.json(user);
  } catch (err) {
    console.error('Lỗi GET /profile:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// PUT: Cập nhật tên (chỉ cập nhật những field được gửi lên)
router.put('/profile', protect, async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;

    // Nếu có gửi addresses lên → cập nhật luôn (dành cho tương lai)
    if (req.body.addresses !== undefined) updates.addresses = req.body.addresses;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ msg: 'Không có dữ liệu để cập nhật' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    console.error('Lỗi PUT /profile:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// POST: Thêm địa chỉ mới
router.post('/profile/address', protect, async (req, res) => {
  try {
    const { fullName, phone, addressLine, isDefault } = req.body;

    if (!fullName || !phone || !addressLine) {
      return res.status(400).json({ msg: 'Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ' });
    }

    const user = await User.findById(req.user._id);

    // Nếu người dùng yêu cầu đặt làm mặc định → bỏ mặc định của cái cũ
    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    // Tự động làm mặc định nếu là địa chỉ đầu tiên
    const shouldBeDefault = isDefault || user.addresses.length === 0;

    user.addresses.push({
      fullName,
      phone,
      addressLine,
      isDefault: shouldBeDefault
    });

    await user.save();
    res.status(201).json(user.addresses);
  } catch (err) {
    console.error('Lỗi thêm địa chỉ:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// PUT: Cập nhật địa chỉ
router.put('/profile/address/:addressId', protect, async (req, res) => {
  try {
    const { fullName, phone, addressLine, isDefault } = req.body;
    const { addressId } = req.params;

    if (!fullName || !addressLine) {
      return res.status(400).json({ msg: 'Họ tên và địa chỉ không được để trống' });
    }

    const user = await User.findById(req.user._id);
    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({ msg: 'Không tìm thấy địa chỉ' });
    }

    // Cập nhật các field
    address.fullName = fullName;
    address.phone = phone || address.phone;
    address.addressLine = addressLine;

    // Xử lý isDefault
    if (isDefault) {
      // Bỏ mặc định của tất cả địa chỉ khác
      user.addresses.forEach(addr => addr.isDefault = false);
      address.isDefault = true;
    }

    await user.save();
    res.json(user.addresses);
  } catch (err) {
    console.error('Lỗi cập nhật địa chỉ:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// DELETE: Xóa địa chỉ
router.delete('/profile/address/:addressId', protect, async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.user._id);

    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ msg: 'Không tìm thấy địa chỉ' });
    }

    // Nếu xóa địa chỉ mặc định → chọn cái đầu tiên làm mặc định (nếu còn)
    if (user.addresses[addressIndex].isDefault && user.addresses.length > 1) {
      user.addresses[0].isDefault = true;
    }

    user.addresses.splice(addressIndex, 1);
    await user.save();

    res.json({ msg: 'Xóa thành công', addresses: user.addresses });
  } catch (err) {
    console.error('Lỗi xóa địa chỉ:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// PUT: Đổi mật khẩu
router.put('/profile/password', protect, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ msg: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ msg: 'Mật khẩu mới phải từ 6 ký tự trở lên' });
    }

    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Mật khẩu cũ không đúng' });
    }

    user.password = newPassword; // pre('save') sẽ tự hash
    await user.save();

    res.json({ msg: 'Đổi mật khẩu thành công' });
  } catch (err) {
    console.error('Lỗi đổi mật khẩu:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

module.exports = router;