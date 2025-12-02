// backend/models/Order.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Schema cho sản phẩm bên trong đơn hàng
const orderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  image: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  // --- THÊM DÒNG NÀY ---
  variantName: { type: String } // Lưu tên biến thể (VD: "27 inch")
  // --------------------
}, { _id: false });

// Schema cho lịch sử trạng thái
const statusHistorySchema = new Schema({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  notes: { type: String }
}, { _id: false });

const orderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],

  shippingAddress: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    address: { type: String, required: true },
    addressLine: { type: String }
  },

  paymentMethod: { type: String, required: true, default: 'cod' },
  
  // Chi tiết tài chính
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true },
  shippingFee: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  couponCode: { type: String, trim: true, uppercase: true },
  total: { type: Number, required: true },

  // Điểm thân thiết
  loyaltyPointsUsed: { type: Number, default: 0 },
  loyaltyPointsEarned: { type: Number, default: 0 },

  // Trạng thái (khớp với yêu cầu)
  currentStatus: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  statusHistory: [statusHistorySchema] // Lịch sử trạng thái

}, {
  timestamps: true // Tự động thêm createdAt và updatedAt
});

module.exports = mongoose.model('Order', orderSchema);