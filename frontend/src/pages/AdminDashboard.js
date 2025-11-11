// src/pages/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import NavbarAdmin from '../components/NavbarAdmin';
import api from '../services/api';
import AdminProducts from './admin/Products';
import Users from './admin/Users';
import Orders from './admin/Orders';
import Coupons from './admin/Coupons';

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState({});
  const [revenueData, setRevenueData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [timeRange, setTimeRange] = useState('year'); // year, quarter, month, week, custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { icon: 'bi-speedometer2', label: 'Tổng quan', path: '/admin' },
    { icon: 'bi-box-seam', label: 'Quản lý sản phẩm', path: '/admin/products' },
    { icon: 'bi-people', label: 'Quản lý người dùng', path: '/admin/users' },
    { icon: 'bi-cart-check', label: 'Quản lý đơn hàng', path: '/admin/orders' },
    { icon: 'bi-tag', label: 'Quản lý mã giảm giá', path: '/admin/coupons' },
  ];

  // TẢI DỮ LIỆU THEO KHOẢNG THỜI GIAN
  const fetchStats = async () => {
    try {
      const params = { range: timeRange };
      if (timeRange === 'custom') {
        params.start = customStart;
        params.end = customEnd;
      }
      const res = await api.get('/admin/stats', { params });
      setStats(res.data.stats);
      setRevenueData(res.data.revenue);
      setPieData(res.data.categories);
      setTopProducts(res.data.topProducts);
    } catch (err) {
      // DỮ LIỆU MẪU KHI CHƯA CÓ API
      setStats({
        totalUsers: 1247,
        newUsers: 89,
        totalOrders: 342,
        revenue: 487290000,
        profit: 187290000,
      });
      setRevenueData([
        { period: 'T1', revenue: 65000000, profit: 25000000, orders: 68 },
        { period: 'T2', revenue: 72000000, profit: 30000000, orders: 75 },
        { period: 'T3', revenue: 68000000, profit: 28000000, orders: 70 },
        { period: 'T4', revenue: 85000000, profit: 35000000, orders: 88 },
        { period: 'T5', revenue: 92000000, profit: 42000000, orders: 95 },
        { period: 'T6', revenue: 78000000, profit: 33000000, orders: 81 },
      ]);
      setPieData([
        { name: 'Laptop', value: 45, color: '#007bff' },
        { name: 'PC', value: 20, color: '#28a745' },
        { name: 'Màn hình', value: 18, color: '#ffc107' },
        { name: 'Phụ kiện', value: 17, color: '#dc3545' },
      ]);
      setTopProducts([
        { name: 'Laptop Dell Inspiron 15', sales: 45 },
        { name: 'Laptop Asus ROG Strix', sales: 38 },
        { name: 'Màn hình Samsung 27"', sales: 29 },
      ]);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [timeRange, customStart, customEnd]);

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <NavbarAdmin />
      <div className="flex-grow-1 p-4 overflow-auto" style={{ marginTop: '13px' }}>
        <div className="d-flex flex-grow-1">
        {/* SIDEBAR */}
        <div
          className={`bg-white border-end shadow-sm transition-all ${sidebarOpen ? 'w-25' : 'w-auto'} p-3`}
          style={{ minWidth: sidebarOpen ? '260px' : '70px' }}
        >
          <div className="d-flex align-items-center justify-content-between mb-4">
            <h5 className={`mb-0 fw-bold text-primary ${!sidebarOpen && 'd-none'}`}>Quản lý</h5>
            <button
              className="btn btn-outline-secondary btn-sm rounded-circle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <i className={`bi ${sidebarOpen ? 'bi-chevron-left' : 'bi-chevron-right'}`}></i>
            </button>
          </div>

          <ul className="nav flex-column">
            {menuItems.map((item, idx) => (
              <li key={idx} className="nav-item mb-2">
                <Link
                  to={item.path}
                  className={`nav-link d-flex align-items-center p-3 rounded-3 transition-all ${
                    location.pathname === item.path 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'text-dark hover-bg-light'
                  }`}
                >
                  <i className={`bi ${item.icon} fs-5 ${sidebarOpen ? 'me-3' : ''}`}></i>
                  {sidebarOpen && <span className="fw-medium">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-grow-1 p-4 overflow-auto">
          <Routes>
            {/* TỔNG QUAN */}
            <Route path="/" element={
              <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h2 className="text-primary fw-bold">Bảng điều khiển</h2>
                  <div className="d-flex gap-2">
                    <select
                      className="form-select form-select-sm"
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value)}
                    >
                      <option value="year">Năm nay</option>
                      <option value="quarter">Quý này</option>
                      <option value="month">Tháng này</option>
                      <option value="week">Tuần này</option>
                      <option value="custom">Tùy chỉnh</option>
                    </select>
                    {timeRange === 'custom' && (
                      <>
                        <input type="date" className="form-control form-control-sm" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                        <input type="date" className="form-control form-control-sm" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                      </>
                    )}
                  </div>
                </div>

                {/* THỐNG KÊ NHANH */}
                <div className="row g-4 mb-5">
                  {[
                    { label: 'Tổng người dùng', value: stats.totalUsers?.toLocaleString(), icon: 'bi-people', color: 'primary' },
                    { label: 'Người dùng mới', value: `+${stats.newUsers}`, icon: 'bi-person-plus', color: 'success' },
                    { label: 'Tổng đơn hàng', value: stats.totalOrders, icon: 'bi-cart-check', color: 'info' },
                    { label: 'Doanh thu', value: `${(stats.revenue / 1000000).toFixed(1)}tr`, icon: 'bi-currency-dollar', color: 'danger' },
                    { label: 'Lợi nhuận', value: `${(stats.profit / 1000000).toFixed(1)}tr`, icon: 'bi-graph-up', color: 'warning' },
                  ].map((item, i) => (
                    <div key={i} className="col-md-2-4">
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-body d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="text-muted small">{item.label}</h6>
                            <h4 className={`text-${item.color} fw-bold`}>{item.value}</h4>
                          </div>
                          <i className={`bi ${item.icon} fs-1 text-${item.color} opacity-25`}></i>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* BIỂU ĐỒ DOANH THU & LỢI NHUẬN */}
                <div className="row g-4">
                  <div className="col-lg-8">
                    <div className="card border-0 shadow-sm">
                      <div className="card-header bg-white">
                        <h5 className="mb-0">Doanh thu & Lợi nhuận</h5>
                      </div>
                      <div className="card-body">
                        <ResponsiveContainer width="100%" height={320}>
                          <LineChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <Tooltip formatter={(v) => `${(v / 1000000).toFixed(1)}tr`} />
                            <Legend />
                            <Line type="monotone" dataKey="revenue" stroke="#007bff" name="Doanh thu" strokeWidth={2} />
                            <Line type="monotone" dataKey="profit" stroke="#28a745" name="Lợi nhuận" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-4">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-header bg-white">
                        <h5 className="mb-0">Phân loại sản phẩm</h5>
                      </div>
                      <div className="card-body">
                        <ResponsiveContainer width="100%" height={320}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={90}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TOP SẢN PHẨM */}
                <div className="card border-0 shadow-sm mt-4">
                  <div className="card-header bg-white">
                    <h5 className="mb-0">Top 5 sản phẩm bán chạy</h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      {topProducts.map((p, i) => (
                        <div key={i} className="col-md-2-4 mb-3">
                          <div className="d-flex align-items-center p-3 bg-light rounded">
                            <div
                              className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                              style={{ width: '40px', height: '40px', fontSize: '1.1rem' }}
                            >
                              {i + 1}
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-1 text-truncate" style={{ maxWidth: '180px' }}>{p.name}</h6>
                              <small className="text-success fw-bold">{p.sales} đơn</small>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            } />

            {/* CÁC TRANG CON */}
            {/* Quản lý sản phẩm */}
            <Route path="products/*" element={<AdminProducts />} />
            {/* Quản lý người dùng */}  
            <Route path="users" element={<Users />} />
            {/* Quản lý đơn hàng */}
            <Route path="orders" element={<Orders />} />
            {/* Quản lý mã giảm giá */}
            <Route path="coupons" element={<Coupons />} />
          </Routes>
        </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;