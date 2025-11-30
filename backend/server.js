// backend/server.js
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const { exec } = require('child_process');

// Routes Imports
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const cartRoutes = require('./routes/cart');
const couponRoutes = require('./routes/coupons');
const categoryRoutes = require('./routes/categories');
const brandRoutes = require('./routes/brands');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/upload');
const aiRoutes = require('./routes/aiRoutes');

// Models
const User = require('./models/User');

connectDB();

const app = express();
app.use(cors({
  origin: ["http://localhost:3000"], 
  credentials: true
}));

const server = http.createServer(app);

// Cấu hình Socket.io
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(passport.initialize());

// === SỬA LỖI: ĐẶT MIDDLEWARE NÀY LÊN TRƯỚC ROUTES ===
app.use((req, res, next) => {
  req.io = io;
  next();
});
// ===================================================

// Social Login
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  let user = await User.findOne({ email: profile.emails[0].value });
  if (!user) {
    user = new User({ email: profile.emails[0].value, name: profile.displayName });
    await user.save();
  }
  done(null, user);
}));

// Routes (Bây giờ các route này đã có thể truy cập req.io)
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/', userRoutes); // Lưu ý: /api/profile nằm trong userRoutes nên dùng path /api/
app.use('/api/upload', uploadRoutes);
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));
app.use('/api/ai', aiRoutes);

// Socket.io Events
io.on('connection', (socket) => {
  console.log('Một người dùng đã kết nối:', socket.id);

  socket.on('joinProductRoom', (productId) => {
    socket.join(productId);
    console.log(`Socket ${socket.id} đã tham gia phòng ${productId}`);
  });

  socket.on('disconnect', () => {
    console.log('Người dùng đã ngắt kết nối:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // --- THÊM ĐOẠN NÀY ĐỂ SYNC DỮ LIỆU TỰ ĐỘNG ---
  console.log('🔄 Server đã chạy. Đang kích hoạt tiến trình đồng bộ ES trong nền...');
  
  // Chạy file sync-es.js như một tiến trình con
  const syncProcess = exec('node sync-es.js');
  
  syncProcess.stdout.on('data', (data) => {
    console.log(`[Sync-ES]: ${data.trim()}`);
  });

  syncProcess.stderr.on('data', (data) => {
    // Không cần in lỗi kết nối ban đầu vì ES đang khởi động
    if (!data.includes('ECONNREFUSED')) {
      console.error(`[Sync-ES Error]: ${data}`);
    }
  });
  // ---------------------------------------------
});