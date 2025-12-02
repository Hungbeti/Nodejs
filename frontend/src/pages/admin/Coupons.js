// src/pages/admin/Coupons.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Modal, Button, Form, Table, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify'; // Giả sử bạn đã cài react-toastify

// === HÀM HELPER: ĐỊNH DẠNG SỐ ===
const formatPriceInput = (value) => {
  const numString = String(value).replace(/[^0-9]/g, '');
  if (!numString) return '';
  return Number(numString).toLocaleString('vi-VN');
};

const parsePriceInput = (value) => {
  return String(value).replace(/\./g, ''); 
};
// ===================================

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    type: 'percent',
    value: 0,
    minOrderValue: 0,
    maxUses: 10,
    applicableCategories: []
  });
  
  // State riêng để hiển thị giá trị đã định dạng
  const [formattedValues, setFormattedValues] = useState({
    value: '0',
    minOrderValue: '0'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [viewingOrders, setViewingOrders] = useState([]);
  const [viewingCoupon, setViewingCoupon] = useState(null);

  // Tải dữ liệu ban đầu
  useEffect(() => {
    fetchCoupons();
    fetchCategories();
  }, []);

  // === CÁC HÀM CƠ BẢN (ĐẦY ĐỦ) ===
  const fetchCoupons = async () => {
    try {
      const { data } = await api.get('/coupons');
      setCoupons(data);
    } catch (err) {
      console.error('Lỗi tải coupons:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data.categories || []);
    } catch (err) { console.error('Lỗi tải categories:', err); }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCoupon({ ...newCoupon, code: result });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn chắc chắn muốn xóa mã này?')) {
      try {
        await api.delete(`/coupons/${id}`);
        toast.success('Đã xóa mã giảm giá');
        fetchCoupons();
      } catch (err) {
        toast.error('Lỗi xóa mã');
      }
    }
  };
  // ===================================

  // === CÁC HÀM XỬ LÝ FORM ===
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCoupon({ ...newCoupon, [name]: value });
  };

  const handlePriceInputChange = (e) => {
    const { name, value } = e.target;
    const rawValue = parsePriceInput(value);
    
    setFormattedValues({ ...formattedValues, [name]: formatPriceInput(rawValue) });
    setNewCoupon({ ...newCoupon, [name]: Number(rawValue) || 0 });
  };

  const handlePercentChange = (e) => {
    let value = e.target.value.replace(/[^0-9]/g, ''); // Chỉ cho phép số
    
    if (value === '') {
      setNewCoupon({...newCoupon, value: 0});
      return;
    }

    // Chuyển sang số (loại bỏ số 0 ở đầu)
    let numValue = Number(value);

    // Giới hạn
    if (numValue > 100) numValue = 100;
    if (numValue < 0) numValue = 0;
    
    // Cập nhật state với giá trị số đã làm sạch
    // Input sẽ tự re-render về giá trị đúng (ví dụ: 1 thay vì 01)
    setNewCoupon({...newCoupon, value: numValue});
  };
  
  const handleCategoryChange = (e) => {
    const options = e.target.options;
    let selected = [];
    let containsAll = false;

    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        if (options[i].value === 'all') {
          containsAll = true;
          break;
        }
        selected.push(options[i].value);
      }
    }
    setNewCoupon({ 
      ...newCoupon, 
      applicableCategories: containsAll ? ['all'] : selected 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (
      newCoupon.type === 'fixed' &&                 // Nếu là giảm tiền cố định
      newCoupon.minOrderValue > 0 &&                // Và có đặt đơn tối thiểu
      newCoupon.value > newCoupon.minOrderValue   // Và giá trị giảm > đơn tối thiểu
    ) {
      setError('Lỗi: Giá trị giảm không được lớn hơn đơn hàng tối thiểu.');
      return; // Dừng, không gửi
    }
    setLoading(true);
    try {
      const payload = { ...newCoupon };
      if (payload.applicableCategories.includes('all')) {
          payload.applicableCategories = [];
      }
      
      await api.post('/coupons', payload);
      toast.success('Tạo mã thành công!');
      setShowModal(false);
      fetchCoupons();
      // Reset form
      setNewCoupon({ code: '', type: 'percent', value: 0, minOrderValue: 0, maxUses: 10, applicableCategories: [] });
      setFormattedValues({ value: '0', minOrderValue: '0' });
    } catch (err) {
      setError(err.response?.data?.msg || 'Lỗi khi tạo mã');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrders = async (coupon) => {
    setViewingCoupon(coupon.code);
    try {
      const { data } = await api.get(`/coupons/${coupon.code}/orders`);
      setViewingOrders(data);
      setShowOrdersModal(true);
    } catch (err) {
      toast.error('Lỗi tải danh sách đơn hàng');
    }
  };

  // === PHẦN RENDER ===
  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="text-primary fw-bold mb-0">Quản lý mã giảm giá</h3>
        <Button variant="success" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg me-2"></i>Tạo mã mới
        </Button>
      </div>

      <div className="table-responsive bg-white p-3 rounded shadow-sm">
        <Table hover className="align-middle">
          <thead className="table-light">
            <tr>
              <th>Mã</th>
              <th>Loại giảm</th>
              <th>Giá trị</th>
              <th>Đơn tối thiểu</th>
              <th>Áp dụng cho</th>
              <th>Đã dùng/Giới hạn</th>
              <th>Ngày tạo</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map(coupon => (
              <tr key={coupon._id}>
                <td><Badge bg="info" className="fs-6">{coupon.code}</Badge></td>
                <td>{coupon.type === 'percent' ? 'Phần trăm (%)' : 'Số tiền cố định'}</td>
                <td className="fw-bold text-success">
                  {coupon.type === 'percent' ? `${coupon.value}%` : `${coupon.value.toLocaleString()}đ`}
                </td>
                <td>{coupon.minOrderValue.toLocaleString()}đ</td>
                <td>{coupon.applicableCategories.length === 0 ? 'Tất cả' : coupon.applicableCategories.map(c => c.name).join(', ')}</td>
                <td>
                  {coupon.uses} / {coupon.maxUses}
                </td>
                <td>{new Date(coupon.createdAt).toLocaleDateString('vi-VN')}</td>
                <td>
                  {coupon.uses >= coupon.maxUses ? (
                    <Badge bg="secondary">Hết lượt</Badge>
                  ) : (
                    <Badge bg="success">Hoạt động</Badge>
                  )}
                </td>
                <td>
                  {/* Nút xem */}
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    className="me-2"
                    onClick={() => handleViewOrders(coupon)}
                    disabled={coupon.uses === 0}
                  >
                    <i className="bi bi-eye"></i>
                  </Button>
                  {/* Nút xóa */}
                  <Button variant="outline-danger" size="sm" onClick={() => handleDelete(coupon._id)}>
                    <i className="bi bi-trash"></i>
                  </Button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center text-muted py-4">Chưa có mã giảm giá nào</td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* MODAL TẠO MÃ MỚI */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Tạo mã giảm giá mới</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && <div className="alert alert-danger">{error}</div>}
            
            <Form.Group className="mb-3">
              <Form.Label>Mã Coupon (5 ký tự chữ/số)</Form.Label>
              <div className="input-group">
                <Form.Control 
                  type="text" 
                  maxLength={5}
                  value={newCoupon.code}
                  name="code"
                  onChange={handleInputChange}
                  onInput={(e) => e.target.value = e.target.value.toUpperCase()}
                  placeholder="VD: SALE5"
                  required
                />
                <Button variant="outline-secondary" onClick={generateCode}>Ngẫu nhiên</Button>
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Đơn hàng tối thiểu (VND)</Form.Label>
              <Form.Control 
                type="text"
                min={0}
                value={formattedValues.minOrderValue}
                name="minOrderValue"
                onChange={handlePriceInputChange}
              />
              <Form.Text className="text-muted">
                Nhập 0 nếu không yêu cầu giá trị tối thiểu.
              </Form.Text>
            </Form.Group>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Loại giảm giá</Form.Label>
                  <Form.Select 
                    name="type"
                    value={newCoupon.type}
                    onChange={handleInputChange}
                  >
                    <option value="percent">Theo phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định (VND)</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Giá trị giảm</Form.Label>
                  <Form.Control 
                    type="text"
                    min={0}
                    max={newCoupon.type === 'percent' ? 100 : undefined}
                    value={newCoupon.type === 'percent' ? newCoupon.value : formattedValues.value}
                    onChange={
                      newCoupon.type === 'percent' 
                        ? handlePercentChange
                        : handlePriceInputChange
                    }
                    name="value"
                    required
                  />
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Phạm vi áp dụng (Giữ Ctrl để chọn nhiều)</Form.Label>
              <Form.Select 
                multiple 
                htmlSize={5}
                value={newCoupon.applicableCategories}
                onChange={handleCategoryChange}
              >
                <option value="all">-- Tất cả sản phẩm --</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Chọn "Tất cả sản phẩm" (sẽ bỏ chọn các mục khác) hoặc chọn các danh mục cụ thể.
              </Form.Text>
            </Form.Group>  

            <Form.Group className="mb-3">
              <Form.Label>Giới hạn số lần sử dụng (Tối đa 10)</Form.Label>
              <Form.Control 
                type="number"
                min={1}
                max={10}
                name="maxUses"
                value={newCoupon.maxUses}
                onChange={handleInputChange}
                required
              />
            </Form.Group>

          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Hủy</Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo mã'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      <Modal show={showOrdersModal} onHide={() => setShowOrdersModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Các đơn hàng đã dùng mã: {viewingCoupon}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table striped bordered hover size="sm">
            <thead className="table-light">
              <tr>
                <th>Mã ĐH</th>
                <th>Người dùng</th>
                <th>Ngày đặt</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {viewingOrders.length > 0 ? (
                viewingOrders.map(order => (
                  <tr key={order._id}>
                    <td>#{order._id.slice(-6)}</td>
                    <td>{order.user?.name || 'N/A'}</td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                    <td>{order.total.toLocaleString()}đ</td>
                    <td><Badge bg="primary">{order.currentStatus}</Badge></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-muted">Không có đơn hàng nào.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Coupons;