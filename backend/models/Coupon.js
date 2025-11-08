// backend/models/Coupon.js
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[A-Z0-9]{5}$/.test(v); // Bắt buộc 5 ký tự chữ và số in hoa
      },
      message: props => `${props.value} không phải là mã hợp lệ (phải gồm 5 ký tự chữ/số)!`
    }
  },
  type: { 
    type: String, 
    enum: ['percent', 'fixed'], // 'percent': giảm %, 'fixed': giảm tiền trực tiếp
    required: true 
  },
  value: { 
    type: Number, 
    required: true,
    min: 0 
  },
  minOrderValue: { 
    type: Number, 
    default: 0, // Điều kiện đơn hàng tối thiểu để áp dụng
    min: 0
  },
  maxUses: { 
    type: Number, 
    default: 10, 
    max: [10, 'Giới hạn sử dụng tối đa là 10 lần'] // Yêu cầu đề bài
  },
  uses: { 
    type: Number, 
    default: 0 
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applicableCategories: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category' 
  }]
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);