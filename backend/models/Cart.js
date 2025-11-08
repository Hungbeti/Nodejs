// backend/models/Cart.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Số lượng phải ít nhất là 1']
  }
});

const cartSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // Đảm bảo mỗi user chỉ có 1 giỏ hàng
  },
  items: [cartItemSchema],
}, {
  timestamps: true
});

module.exports = mongoose.model('Cart', cartSchema);