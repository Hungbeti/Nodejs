const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, match: /^[a-zA-Z0-9]{5}$/ }, // 5 alphanumeric
  discount: Number,
  maxUses: { type: Number, default: 10 },
  uses: { type: Number, default: 0 },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }]
});

module.exports = mongoose.model('Coupon', couponSchema);