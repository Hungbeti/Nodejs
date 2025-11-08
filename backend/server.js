//backend/server.js
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const cartRoutes = require('./routes/cart');
const couponRoutes = require('./routes/coupons');
const categoryRoutes = require('./routes/categories');
const brandRoutes = require('./routes/brands');
const userRoutes = require('./routes/userRoutes');

// Models
const User = require('./models/User');

connectDB();

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(passport.initialize());

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api', userRoutes);

// Socket.io
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: 'http://localhost:3000' } });
io.on('connection', (socket) => {
  socket.on('comment', (data) => {
    io.emit('newComment', data);
  });
  socket.on('rating', (data) => {
    io.emit('newRating', data);
  });
  socket.on('cartUpdate', (data) => {
    io.emit('cartUpdated', data);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));