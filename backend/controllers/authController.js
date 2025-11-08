// backend/controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// HÀM ĐĂNG KÝ – ĐÃ CẬP NHẬT
const register = async (req, res) => {
  const { email, name, address } = req.body;

  try {
    // Kiểm tra email
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email đã tồn tại' });

    // Tạo mật khẩu ngẫu nhiên 8 ký tự
    const randomPassword = crypto.randomBytes(4).toString('hex');

    const firstAddress = {
      fullName: name,         // Lấy từ trường 'name'
      addressLine: address,   // Lấy từ trường 'address'
      phone: '',              // Để trống vì form không có
      isDefault: true         // Đặt làm mặc định
    };
    
    const user = new User({
      email,
      name,
      addresses: [firstAddress], // Lưu vào mảng addresses
      password: randomPassword,
      isFirstLogin: true, // Đặt cờ bắt buộc đổi mật khẩu
      role: 'user'
    });
    await user.save();

    // Gửi email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: '"PC Shop" <no-reply@pcshop.com>',
      to: email,
      subject: 'Chào mừng bạn đến PC Shop!',
      html: `
        <h3>Xin chào ${name}!</h3>
        <p>Tài khoản của bạn đã được tạo.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mật khẩu tạm:</strong> <code>${randomPassword}</code></p>
        <p><strong>Vui lòng đổi mật khẩu ngay khi đăng nhập!</strong></p>
      `
    });

    res.json({ message: 'Đăng ký thành công! Mật khẩu đã gửi về email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// ĐĂNG NHẬP – ĐÃ CẬP NHẬT
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    
    if (!user || !user.password) {
        return res.status(401).json({ message: 'Tài khoản này được tạo qua Google hoặc chưa có mật khẩu.' });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Sai email hoặc mật khẩu' });
    }

    const token = jwt.sign(
      { _id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Trả về cờ requiresPasswordChange
    res.json({ 
      token, 
      requiresPasswordChange: user.isFirstLogin, 
      role: user.role 
    });

  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// ĐỔI MẬT KHẨU LẦN ĐẦU – ĐÃ CẬP NHẬT
const changePasswordFirst = async (req, res) => {
  // Lấy token từ body thay vì header, để khớp với frontend
  const { token, newPassword } = req.body; 
  if (!token) return res.status(401).json({ message: 'Không có token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });

    user.password = newPassword;
    user.isFirstLogin = false; // Cập nhật cờ
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = { register, login, changePasswordFirst };