// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

      const user = await User.findById(decoded._id).select('-password');
      if (!user) {
        return res.status(401).json({ msg: 'Người dùng không tồn tại' });
      }

      if (!user.isActive) {
        return res.status(403).json({ msg: 'Tài khoản đã bị khóa' });
      }

      req.user = user;
      return next();
    } catch (err) {
      return res.status(401).json({ msg: 'Token không hợp lệ hoặc đã hết hạn' });
    }
  }

  // Nếu không có token → trả JSON, KHÔNG redirect!
  return res.status(401).json({ msg: 'Không có quyền truy cập (thiếu token)' });
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ msg: 'Yêu cầu quyền Admin' });
  }
};

module.exports = { protect, admin };