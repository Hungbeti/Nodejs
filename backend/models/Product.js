// backend/models/Product.js
const mongoose = require('mongoose');

// Schema cho bình luận/đánh giá
const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5 },
  comment: { type: String, required: true }
}, { timestamps: true });

// Schema cho Biến thể (MỚI)
const variantSchema = new mongoose.Schema({
  name: { type: String, required: true }, // VD: "16GB - Đen"
  price: { type: Number, required: true }, // Giá riêng
  stock: { type: Number, required: true }, // Kho riêng
  sku: { type: String }
}, { _id: true });

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  
  // Giá hiển thị (thường là giá thấp nhất của các biến thể)
  price:       { type: Number, required: true }, 
  
  images:      { type: [String], required: true },
  description: { type: String, required: true },
  
  // Tổng tồn kho (tổng cộng của các biến thể)
  stock:       { type: Number, default: 0 }, 
  
  category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category'},
  brand:       { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  sold:        { type: Number, default: 0 },
  
  // Mảng biến thể (BẮT BUỘC)
  variants:    { 
    type: [variantSchema], 
    validate: [arrayLimit, '{PATH} phải có ít nhất 2 biến thể'] 
  },

  reviews: [reviewSchema]
}, {
  timestamps: true 
});

// Hàm validate độ dài mảng variants
function arrayLimit(val) {
  return val.length >= 2;
}

module.exports = mongoose.model('Product', productSchema);