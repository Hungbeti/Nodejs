// backend/models/Product.js
const mongoose = require('mongoose');

// Schema cho bình luận/đánh giá
const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  rating: { type: Number, required: true }, // Từ 1 đến 5
  comment: { type: String, required: true }
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  price:       { type: Number, required: true },
  images:       { type: [String], required: true },
  description:{ type: String, required: true },
  stock:       { type: Number, required: true },
  category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category'},
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  sold: { type: Number, default: 0 },
  reviews: [reviewSchema]
}, {
  timestamps: true // Tự động thêm createdAt
});

module.exports = mongoose.model('Product', productSchema);