// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // <-- 1. IMPORT USER MODEL

const protect = async (req, res, next) => { // <-- 2. THÊM 'async'
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

      // 3. SỬA LỖI: Dùng ID từ token để TÌM user trong CSDL
      req.user = await User.findById(decoded._id).select('-password');
      // ===================================================

      if (!req.user) {
        return res.status(401).json({ msg: 'Không tìm thấy người dùng' });
      }

      // 4. (Giữ lại) Kiểm tra tài khoản
      if (req.user.isActive === false) { 
         return res.status(403).json({ msg: 'Tài khoản đã bị khóa' });
      }

      next();
    } catch (err) {
      res.status(401).json({ msg: 'Token không hợp lệ' });
    }
  }

  if (!token) {
    res.status(401).json({ msg: 'Không có token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ msg: 'Không có quyền admin' });
  }
};

module.exports = { protect, admin };