//backend/routes/auth.js
const express = require('express');
const router = express.Router();
const { register, login, changePasswordFirst } = require('../controllers/authController');
const passport = require('passport');

router.post('/register', register);
router.post('/login', login);
// ĐỔI MẬT KHẨU LẦN ĐẦU
router.post('/change-password-first', changePasswordFirst);
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  // Token logic
  res.redirect('/'); // Or send token
});
// Similar for facebook

module.exports = router;