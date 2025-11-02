// backend/controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// HÀM ĐĂNG KÝ – PHẢI CÓ
const register = async (req, res) => {
  const { email, name, address } = req.body;

  try {
    // Kiểm tra email
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email đã tồn tại' });

    // Tạo mật khẩu ngẫu nhiên
    const randomPassword = crypto.randomBytes(5).toString('hex');
    const hashedPassword = bcrypt.hashSync(randomPassword, 10);

    const user = new User({
      email,
      name,
      address,
      password: hashedPassword,
      mustChangePassword: true,
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

    const token = jwt.sign(
      { _id: user._id, role: user.role }, // role: 'admin' hoặc 'user'
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

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

// ĐĂNG NHẬP
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Sai email hoặc mật khẩu' });
    }

    const token = jwt.sign(
      { _id: user._id, email: user.email, role: user.role }, // TRẢ ROLE DỰA TRÊN isAdmin
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// ĐỔI MẬT KHẨU LẦN ĐẦU
const changePasswordFirst = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Không có token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });

    const { newPassword } = req.body;
    user.password = bcrypt.hashSync(newPassword, 10);
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = { register, login, changePasswordFirst }; // ĐÚNG EXPORT