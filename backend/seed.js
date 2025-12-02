// backend/seed.js
const mongoose = require('mongoose');
//const Product = require('./models/Product');
const User = require('./models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Kết nối MongoDB thành công!');

    // XÓA TẤT CẢ USER (trừ admin nếu cần)
    await User.deleteMany({});

    // TẠO ADMIN
    await User.create({
      email: "admin@pcshop.com",
      password: "admin123", // sẽ được hash tự động nếu có middleware
      name: "Admin",
      role: "admin"
    });

    console.log('TẠO ADMIN THÀNH CÔNG!');
    console.log('Email: admin@pcshop.com');
    console.log('Mật khẩu: admin123');
    process.exit();
  } catch (err) {
    console.error('Lỗi:', err.message);
    process.exit(1);
  }
};

seedAdmin();