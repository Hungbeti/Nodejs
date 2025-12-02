// backend/models/Brand.js
const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  }
}, { timestamps: true });

// TRÁNH TRÙNG TRONG CÙNG DANH MỤC
brandSchema.index({ name: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Brand', brandSchema);