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

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa.' });
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

// QUÊN MẬT KHẨU
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Bảo mật: Không thông báo "Không tìm thấy user"
      return res.json({ message: 'Email khôi phục đã được gửi (nếu tồn tại)' });
    }

    // 1. Tạo token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 phút

    await user.save();

    // 2. Tạo URL (Frontend)
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

    // 3. Gửi email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
      from: '"PC Shop" <no-reply@pcshop.com>',
      to: user.email,
      subject: 'Khôi phục mật khẩu PC Shop',
      html: `
        <h3>Xin chào ${user.name},</h3>
        <p>Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu khôi phục mật khẩu.</p>
        <p>Vui lòng nhấn vào link sau để đặt lại mật khẩu (link có hiệu lực 10 phút):</p>
        <a href="${resetUrl}" target="_blank">${resetUrl}</a>
        <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
      `
    });

    res.json({ message: 'Email khôi phục đã được gửi' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// HÀM MỚI 2: ĐẶT LẠI MẬT KHẨU
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    // 1. Hash token từ URL để so sánh với CSDL
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Tìm user bằng token và kiểm tra thời gian hết hạn
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() } // $gt = "greater than" (lớn hơn)
    });

    if (!user) {
      return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    // 3. Đặt mật khẩu mới (Model sẽ tự hash)
    user.password = newPassword;
    user.isFirstLogin = false; // Đảm bảo trạng thái này được reset
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = { register, login, changePasswordFirst, forgotPassword, resetPassword };