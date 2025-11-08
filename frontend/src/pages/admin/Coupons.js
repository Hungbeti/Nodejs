// src/pages/admin/Coupons.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Modal, Button, Form, Table, Badge } from 'react-bootstrap';

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    type: 'percent', // Mặc định là giảm theo %
    value: 0,
    minOrderValue: 0,
    maxUses: 10,
    applicableCategories: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCoupons();
    fetchCategories();
  }, []);

  // Tải danh sách coupon
  const fetchCoupons = async () => {
    try {
      const { data } = await api.get('/coupons'); // Route admin đã định nghĩa
      setCoupons(data);
    } catch (err) {
      console.error('Lỗi tải coupons:', err);
    }
  };
  // Tải danh sách category
  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data.categories || []);
    } catch (err) { console.error('Lỗi tải categories:', err); }
  };

  // Tạo mã ngẫu nhiên 5 ký tự
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCoupon({ ...newCoupon, code: result });
  };

  // Xóa coupon
  const handleDelete = async (id) => {
    if (window.confirm('Bạn chắc chắn muốn xóa mã này?')) {
      try {
        await api.delete(`/coupons/${id}`);
        fetchCoupons();
      } catch (err) {
        alert('Lỗi xóa mã');
      }
    }
  };

  // Xử lý chọn danh mục (Multi-select đơn giản)
  const handleCategoryChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(options[i].value);
      }
    }
    setNewCoupon({ ...newCoupon, applicableCategories: selected });
  };

  // Xử lý Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...newCoupon };
      if (payload.applicableCategories.includes('all')) {
          payload.applicableCategories = [];
      }
      await api.post('/coupons', payload);
      alert('Tạo mã thành công!');
      setShowModal(false);
      fetchCoupons(); // Tải lại danh sách
      // Reset form
      setNewCoupon({ code: '', type: 'percent', value: 0, minOrderValue: 0, maxUses: 10, applicableCategories: [] });
    } catch (err) {
      setError(err.response?.data?.msg || 'Lỗi khi tạo mã');
    } finally {
      setLoading(false);
    }
  };

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
                <td>
                  {coupon.uses >= coupon.maxUses ? (
                    <Badge bg="secondary">Hết lượt</Badge>
                  ) : (
                    <Badge bg="success">Hoạt động</Badge>
                  )}
                </td>
                <td>
                  <Button variant="outline-danger" size="sm" onClick={() => handleDelete(coupon._id)}>
                    <i className="bi bi-trash"></i>
                  </Button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center text-muted py-4">Chưa có mã giảm giá nào</td>
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
                  onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                  placeholder="VD: SALE5"
                  required
                />
                <Button variant="outline-secondary" onClick={generateCode}>Ngẫu nhiên</Button>
              </div>
            </Form.Group>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Loại giảm giá</Form.Label>
                  <Form.Select 
                    value={newCoupon.type}
                    onChange={(e) => setNewCoupon({...newCoupon, type: e.target.value})}
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
                    type="number"
                    min={0}
                    max={newCoupon.type === 'percent' ? 100 : undefined}
                    value={newCoupon.value}
                    onChange={(e) => setNewCoupon({...newCoupon, value: Number(e.target.value)})}
                    required
                  />
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Đơn hàng tối thiểu (VND)</Form.Label>
              <Form.Control 
                type="number"
                min={0}
                value={newCoupon.minOrderValue}
                onChange={(e) => setNewCoupon({...newCoupon, minOrderValue: Number(e.target.value)})}
              />
              <Form.Text className="text-muted">
                Nhập 0 nếu không yêu cầu giá trị tối thiểu.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Phạm vi áp dụng (Giữ Ctrl để chọn nhiều)</Form.Label>
              <Form.Select 
                multiple 
                htmlSize={5} // Hiển thị 5 dòng
                value={newCoupon.applicableCategories}
                onChange={handleCategoryChange}
              >
                <option value="all">-- Tất cả sản phẩm --</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Chọn "Tất cả sản phẩm" hoặc chọn các danh mục cụ thể.
              </Form.Text>
            </Form.Group>  

            <Form.Group className="mb-3">
              <Form.Label>Giới hạn số lần sử dụng (Tối đa 10)</Form.Label>
              <Form.Control 
                type="number"
                min={1}
                max={10}
                value={newCoupon.maxUses}
                onChange={(e) => setNewCoupon({...newCoupon, maxUses: Number(e.target.value)})}
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
    </div>
  );
};

export default Coupons;