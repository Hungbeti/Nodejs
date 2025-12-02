const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category'); 
const Coupon = require('../models/Coupon');
const { protect, admin } = require('../middleware/auth');

/**
 * GET /api/admin/stats
 * Lấy thống kê toàn diện cho Dashboard
 */
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const { range, start, end } = req.query;
    
    // 1. XÁC ĐỊNH KHOẢNG THỜI GIAN (Date Range)
    let startDate = new Date();
    let endDate = new Date();
    let groupByFormat = '%Y-%m-%d'; 

    // --- SỬA LỖI: Helper xử lý ngày chính xác ---
    // Chuyển chuỗi 'YYYY-MM-DD' thành Date object bắt đầu từ 00:00:00
    const parseStartDay = (dateStr) => {
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return d;
    };
    // Chuyển chuỗi 'YYYY-MM-DD' thành Date object kết thúc lúc 23:59:59
    const parseEndDay = (dateStr) => {
        const d = new Date(dateStr);
        d.setHours(23, 59, 59, 999);
        return d;
    };
    // -------------------------------------------

    if (range === 'year') {
      startDate = new Date(new Date().getFullYear(), 0, 1); 
      groupByFormat = '%m'; 
    } else if (range === 'quarter') {
      const currentQuarter = Math.floor((new Date().getMonth() + 3) / 3);
      startDate = new Date(new Date().getFullYear(), (currentQuarter - 1) * 3, 1);
      groupByFormat = '%m';
    } else if (range === 'month') {
      startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      groupByFormat = '%d'; 
    } else if (range === 'week') {
      const now = new Date();
      const day = now.getDay() || 7; 
      startDate = new Date(now);
      if (day !== 1) startDate.setHours(-24 * (day - 1)); 
      else startDate = now;
      startDate.setHours(0, 0, 0, 0);
      groupByFormat = '%d'; 
    } else if (range === 'custom' && start && end) {
      // --- SỬA LỖI: Dùng hàm parse mới để đảm bảo bao trọn ngày ---
      // Nếu start và end giống nhau (vd: hôm nay), nó sẽ lấy từ 00:00 đến 23:59 của ngày đó
      startDate = parseStartDay(start);
      endDate = parseEndDay(end);
      
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      groupByFormat = diffDays > 60 ? '%m' : '%d';
    } else {
      startDate = new Date(new Date().setDate(new Date().getDate() - 30));
      startDate.setHours(0, 0, 0, 0);
    }

    const matchCondition = {
      createdAt: { $gte: startDate, $lte: endDate },
      currentStatus: { $ne: 'cancelled' } 
    };

    // --- A. TỔNG QUAN ---
    const totalUsers = await User.countDocuments({ role: 'user' });
    
    // Đếm người dùng mới trong khoảng thời gian đã lọc
    const newUsers = await User.countDocuments({ 
      role: 'user', 
      createdAt: { $gte: startDate, $lte: endDate } 
    });
    
    const overviewStats = await Order.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    const revenue = overviewStats[0]?.totalRevenue || 0;
    const totalOrders = overviewStats[0]?.totalOrders || 0;
    const profit = Math.floor(revenue * 0.3); 

    // --- B. BIỂU ĐỒ ---
    const chartDataRaw = await Order.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: "$createdAt" } },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } } 
    ]);

    const chartData = chartDataRaw.map(item => ({
      name: range === 'year' ? `T${item._id}` : item._id,
      revenue: item.revenue,
      profit: Math.floor(item.revenue * 0.3),
      orders: item.orders
    }));

    // --- C. BIỂU ĐỒ TRÒN ---
    const categoryStats = await Order.aggregate([
      { $match: matchCondition },
      { $unwind: "$items" }, 
      {
        $lookup: { 
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: "$productInfo" },
      {
        $lookup: { 
          from: "categories",
          localField: "productInfo.category",
          foreignField: "_id",
          as: "categoryInfo"
        }
      },
      { $unwind: "$categoryInfo" }, 
      {
        $group: {
          _id: "$categoryInfo.name",
          value: { $sum: "$items.quantity" } 
        }
      }
    ]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
    const pieData = categoryStats.map((item, index) => ({
      name: item._id,
      value: item.value,
      color: COLORS[index % COLORS.length]
    }));

    // --- D. TOP SẢN PHẨM ---
    const topProducts = await Order.aggregate([
      { $match: matchCondition },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name", 
          sales: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      { $sort: { sales: -1 } }, 
      { $limit: 5 }, 
      {
        $project: {
          name: "$_id",
          sales: 1,
          revenue: 1,
          _id: 0
        }
      }
    ]);

    res.json({
      overview: {
        totalUsers,
        newUsers,
        totalOrders,
        revenue,
        profit
      },
      chart: chartData,
      pie: pieData,
      topProducts
    });

  } catch (err) {
    console.error("Lỗi thống kê:", err);
    res.status(500).json({ msg: 'Lỗi server khi lấy thống kê' });
  }
});

// ... (Giữ nguyên các route users/ban ở dưới) ...
router.get('/users', protect, admin, async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password') 
      .sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    console.error("Lỗi lấy danh sách user:", err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

router.put('/users/:id/ban', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'Không tìm thấy người dùng' });
    if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ msg: 'Không thể tự khóa tài khoản admin của chính mình' });
    }
    user.isActive = !user.isActive;
    await user.save();
    res.json({ msg: 'Cập nhật trạng thái thành công', user });
  } catch (err) {
    console.error("Lỗi cập nhật trạng thái user:", err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

module.exports = router;