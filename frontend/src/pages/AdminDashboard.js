// src/pages/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, useLocation } from 'react-router-dom';
import { 
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart 
} from 'recharts';
import NavbarAdmin from '../components/NavbarAdmin';
import api from '../services/api';

// Import các trang con
import AdminProducts from './admin/Products';
import Users from './admin/Users';
import Orders from './admin/Orders';
import Coupons from './admin/Coupons';

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // State dữ liệu thống kê
  const [stats, setStats] = useState({
    totalUsers: 0,
    newUsers: 0,
    totalOrders: 0,
    revenue: 0,
    profit: 0
  });
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  
  // State bộ lọc
  const [timeRange, setTimeRange] = useState('year'); 
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  const location = useLocation();

  const menuItems = [
    { icon: 'bi-speedometer2', label: 'Tổng quan', path: '/admin' },
    { icon: 'bi-box-seam', label: 'Quản lý sản phẩm', path: '/admin/products' },
    { icon: 'bi-people', label: 'Quản lý người dùng', path: '/admin/users' },
    { icon: 'bi-cart-check', label: 'Quản lý đơn hàng', path: '/admin/orders' },
    { icon: 'bi-tag', label: 'Quản lý mã giảm giá', path: '/admin/coupons' },
  ];

  // === HÀM LẤY DỮ LIỆU THẬT TỪ API ===
  const fetchStats = async () => {
    try {
      const params = { 
        range: timeRange,
        start: timeRange === 'custom' ? customStart : undefined,
        end: timeRange === 'custom' ? customEnd : undefined
      };

      // Gọi API thống kê (Bạn cần đảm bảo backend đã có route này)
      // Ví dụ: GET /api/admin/stats
      const { data } = await api.get('/admin/stats', { params });

      if (data) {
        setStats(data.overview || { totalUsers: 0, newUsers: 0, totalOrders: 0, revenue: 0, profit: 0 });
        setChartData(data.chart || []);
        setPieData(data.pie || []);
        setTopProducts(data.topProducts || []);
      }
    } catch (err) {
      console.error("Lỗi tải thống kê:", err);
      // Không fallback về dữ liệu giả nữa để tránh hiểu nhầm
    }
  };

  useEffect(() => {
    // Nếu chọn custom nhưng chưa chọn ngày thì chưa gọi API
    if (timeRange === 'custom' && (!customStart || !customEnd)) return;
    
    fetchStats();
  }, [timeRange, customStart, customEnd]);

  // Helper format tiền tệ
  const formatCurrency = (value) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)} tỷ`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(0)}tr`;
    return value.toLocaleString();
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <NavbarAdmin />
      
      <div className="flex-grow-1 d-flex overflow-hidden" style={{ marginTop: '0px' }}>
        
        {/* SIDEBAR */}
        <div
          className={`bg-white border-end shadow-sm transition-all ${sidebarOpen ? 'w-25' : 'w-auto'} d-flex flex-column`}
          style={{ minWidth: sidebarOpen ? '260px' : '70px', transition: 'width 0.3s' }}
        >
          <div className="p-3 d-flex align-items-center justify-content-between">
            <h5 className={`mb-0 fw-bold text-primary text-truncate ${!sidebarOpen && 'd-none'}`}>Quản trị viên</h5>
            <button className="btn btn-sm btn-light border" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <i className={`bi ${sidebarOpen ? 'bi-chevron-left' : 'bi-chevron-right'}`}></i>
            </button>
          </div>
          <hr className="my-0"/>
          <ul className="nav flex-column p-2">
            {menuItems.map((item, idx) => (
              <li key={idx} className="nav-item mb-1">
                <Link
                  to={item.path}
                  className={`nav-link d-flex align-items-center px-3 py-3 rounded ${
                    location.pathname === item.path ? 'bg-primary text-white shadow-sm' : 'text-dark hover-bg-light'
                  }`}
                >
                  <i className={`bi ${item.icon} fs-5 ${sidebarOpen ? 'me-3' : ''}`}></i>
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-grow-1 p-4 overflow-auto" style={{ height: 'calc(100vh - 60px)' }}>
          <Routes>
            <Route path="/" element={
              <div className="container-fluid">
                
                {/* --- PHẦN 1: BẢNG ĐIỀU KHIỂN ĐƠN GIẢN --- */}
                <div className="mb-5">
                  <h4 className="text-primary fw-bold mb-3"><i className="bi bi-grid-fill me-2"></i>Tổng quan hiệu suất</h4>
                  <div className="row g-3">
                    {[
                      { title: 'Tổng người dùng', val: stats.totalUsers, sub: `+${stats.newUsers} mới`, icon: 'bi-people-fill', color: 'primary' },
                      { title: 'Tổng đơn hàng', val: stats.totalOrders, sub: 'Đã hoàn thành', icon: 'bi-bag-check-fill', color: 'success' },
                      { title: 'Tổng doanh thu', val: stats.revenue?.toLocaleString('vi-VN') + 'đ', sub: 'Toàn thời gian', icon: 'bi-currency-dollar', color: 'warning' },
                      { title: 'Lợi nhuận ước tính', val: stats.profit?.toLocaleString('vi-VN') + 'đ', sub: '~30% doanh thu', icon: 'bi-graph-up-arrow', color: 'danger' },
                    ].map((card, i) => (
                      <div key={i} className="col-12 col-sm-6 col-xl-3">
                        <div className={`card border-0 shadow-sm h-100 border-start border-4 border-${card.color}`}>
                          <div className="card-body">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <h6 className="text-muted mb-0">{card.title}</h6>
                              <div className={`bg-${card.color} bg-opacity-10 p-2 rounded`}>
                                <i className={`bi ${card.icon} text-${card.color} fs-4`}></i>
                              </div>
                            </div>
                            <h4 className="fw-bold mb-1">{card.val}</h4>
                            <small className="text-muted">{card.sub}</small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* --- PHẦN 2: BẢNG ĐIỀU KHIỂN NÂNG CAO --- */}
                <div className="mb-4">
                  <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
                    <h4 className="text-dark fw-bold mb-0"><i className="bi bi-bar-chart-line-fill me-2"></i>Phân tích chi tiết</h4>
                    
                    <div className="d-flex gap-2 bg-white p-2 rounded shadow-sm">
                      <select className="form-select form-select-sm border-0 bg-light fw-bold" 
                        value={timeRange} onChange={(e) => setTimeRange(e.target.value)} style={{width: '120px'}}>
                        <option value="year">Theo Năm</option>
                        <option value="quarter">Theo Quý</option>
                        <option value="month">Theo Tháng</option>
                        <option value="week">Theo Tuần</option>
                        <option value="custom">Tùy chỉnh</option>
                      </select>
                      {timeRange === 'custom' && (
                        <>
                          <input type="date" className="form-control form-control-sm" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                          <span className="align-self-center">-</span>
                          <input type="date" className="form-control form-control-sm" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* BIỂU ĐỒ */}
                  <div className="row g-4">
                    <div className="col-lg-8">
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white py-3">
                          <h6 className="mb-0 fw-bold">Biểu đồ tăng trưởng</h6>
                        </div>
                        <div className="card-body">
                          <div style={{ width: '100%', height: 350, minWidth: 250, minHeight: 100 }}>
                            <ResponsiveContainer>
                              <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
                                <XAxis dataKey="name" scale="point" padding={{ left: 30, right: 30 }} />
                                <YAxis yAxisId="left" tickFormatter={formatCurrency} orientation="left" stroke="#8884d8" />
                                <YAxis yAxisId="right" orientation="right" stroke="#ff7300" />
                                <Tooltip formatter={(value, name) => [value.toLocaleString(), name]} />
                                <Legend />
                                <Area yAxisId="left" type="monotone" dataKey="revenue" name="Doanh thu" fill="#0d6efd" stroke="#0d6efd" fillOpacity={0.1} />
                                <Bar yAxisId="left" dataKey="profit" name="Lợi nhuận" barSize={20} fill="#198754" />
                                <Line yAxisId="right" type="monotone" dataKey="orders" name="Đơn hàng" stroke="#ffc107" strokeWidth={3} dot={{r: 4}} />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-lg-4">
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-white py-3">
                          <h6 className="mb-0 fw-bold">Tỷ trọng danh mục</h6>
                        </div>
                        <div className="card-body d-flex flex-column justify-content-center align-items-center">
                          <div style={{ width: '100%', height: 250, minWidth: 250, minHeight: 100 }}>
                            <ResponsiveContainer>
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#0d6efd', '#198754', '#ffc107', '#dc3545'][index % 4]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TOP SẢN PHẨM */}
                  <div className="row mt-4">
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white py-3">
                          <h6 className="mb-0 fw-bold">Top 5 Sản phẩm bán chạy nhất</h6>
                        </div>
                        <div className="card-body">
                          <div style={{ width: '100%', height: 300, minWidth: 250, minHeight: 100 }}>
                            <ResponsiveContainer>
                              <BarChart
                                layout="vertical"
                                data={topProducts}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="sales" name="Số lượng đã bán" fill="#0dcaf0" barSize={20} radius={[0, 10, 10, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            } />

            {/* ROUTES CON */}
            <Route path="products/*" element={<AdminProducts />} />
            <Route path="users" element={<Users />} />
            <Route path="orders" element={<Orders />} />
            <Route path="coupons" element={<Coupons />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;