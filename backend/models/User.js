//backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  // Sử dụng 'address' thay vì 'name' để lưu tên gợi nhớ (vd: "Nhà", "Công ty")
  // Hoặc dùng một chuỗi đầy đủ:
  fullName: { type: String, required: true },
  phone: { type: String },
  addressLine: { type: String, required: true }, // (Số nhà, đường, phường/xã, quận/huyện, tỉnh/tp)
  isDefault: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: String,
  name: { type: String, required: true },
  addresses: [addressSchema],
  loyaltyPoints: { type: Number, default: 0 },
  role: { type: String, default: 'user' },
  isFirstLogin: { type: Boolean, default: true }, // BẮT BUỘC ĐỔI MẬT KHẨU
  isActive: { type: Boolean, default: true }
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);