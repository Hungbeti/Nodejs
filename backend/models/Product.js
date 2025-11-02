// backend/models/Product.js
const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  price:       { type: Number, required: true },
  images:       { type: [String], required: true },
  description:{ type: String, required: true },
  stock:       { type: Number, required: true },
  category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category'},
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' }
});
module.exports = mongoose.model('Product', productSchema);