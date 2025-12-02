// backend/models/Cart.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  // --- THÊM CÁC TRƯỜNG NÀY ---
  variantId: { type: String }, // ID của biến thể
  variantName: { type: String }, // Tên biến thể (VD: 6T)
  price: { type: Number, required: true }, // Lưu giá riêng của biến thể đó
  // ---------------------------
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
    unique: true 
  },
  items: [cartItemSchema],
}, {
  timestamps: true
});

module.exports = mongoose.model('Cart', cartSchema);