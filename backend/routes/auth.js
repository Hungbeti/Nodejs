//backend/routes/auth.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// TẠO MẬT KHẨU NGẪU NHIÊN 8 KÝ TỰ
const generatePassword = () => {
  return crypto.randomBytes(4).toString('hex'); // 8 ký tự
};

// === SỬA LỖI: HỢP NHẤT HAI KHỐI REQUIRE ===
const { 
  register, 
  login, 
  changePasswordFirst,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
// ======================================

router.post('/register', register);
router.post('/login', login);
router.post('/change-password-first', changePasswordFirst);

// GOOGLE AUTH
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// GOOGLE CALLBACK
router.get(
  '/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login', session: false }), 
  (req, res) => {
    const user = req.user;
    const token = jwt.sign(
      { _id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.redirect(`http://localhost:3000/google-success?token=${token}`);
  }
);

// ROUTE QUÊN MẬT KHẨU
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

module.exports = router;