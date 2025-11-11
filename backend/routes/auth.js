//backend/routes/auth.js
const express = require('express');
const router = express.Router();
const { register, login, changePasswordFirst } = require('../controllers/authController');
const passport = require('passport');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// TẠO MẬT KHẨU NGẪU NHIÊN 8 KÝ TỰ
const generatePassword = () => {
  return crypto.randomBytes(4).toString('hex'); // 8 ký tự
};

router.post('/register', register);
router.post('/login', login);
// ĐỔI MẬT KHẨU LẦN ĐẦU
router.post('/change-password-first', changePasswordFirst);

// GOOGLE AUTH
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// GOOGLE CALLBACK - ĐÃ CẬP NHẬT
router.get(
  '/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login', session: false }), 
  (req, res) => {
    // req.user được trả về từ passport strategy
    const user = req.user;
    
    // Tạo token
    const token = jwt.sign(
      { _id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Chuyển hướng về trang frontend (giả sử cổng 3000) với token
    res.redirect(`http://localhost:3000/google-success?token=${token}`);
  }
);
// Similar for facebook

module.exports = router;