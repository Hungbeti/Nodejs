// src/pages/admin/Orders.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
// 1. SỬA LỖI IMPORT: Thêm Pagination, InputGroup, FormControl
import { Modal, Button, Form, Pagination, InputGroup, FormControl } from 'react-bootstrap';
import { toast } from 'react-toastify';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  // State cho phân trang và lọc
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // 2. SỬA LỖI HÀM: Thêm tham số (pageToFetch)
  const fetchOrders = async (pageToFetch = 1) => {
    setLoading(true);
    try {
      const params = {
        page: pageToFetch, // Sử dụng tham số
        range: filter,
      };

      if (filter === 'custom' && customStart && customEnd) {
        params.start = customStart;
        params.end = customEnd;
      }

      const { data } = await api.get('/orders', { params }); 
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
      setPage(data.currentPage || 1);
    } catch (err) {
      console.error('Lỗi tải đơn hàng admin:', err);
    } finally {
      setLoading(false);
    }
  };

  // Tải lại khi bộ lọc hoặc trang thay đổi
  useEffect(() => {
    // Chỉ tải khi filter custom đã đủ ngày
    if (filter === 'custom' && (!customStart || !customEnd)) {
      setOrders([]);
      setTotalPages(0);
      return; 
    }
    fetchOrders(1); // Reset về trang 1 khi đổi lọc
  }, [filter, customStart, customEnd]);

  // Tải chi tiết một đơn hàng
  const handleViewOrder = async (id) => {
    try {
      const { data } = await api.get(`/orders/${id}`); 
      setSelectedOrder(data);
      setNewStatus(data.currentStatus);
      setShowModal(true);
    } catch (err) {
      console.error('Lỗi tải chi tiết đơn hàng:', err);
    }
  };

  // Cập nhật trạng thái
  const handleUpdateStatus = async () => {
    try {
      await api.patch(`/orders/${selectedOrder._id}/status`, { status: newStatus });
      setShowModal(false);
      fetchOrders(page); // Tải lại trang hiện tại
      toast('Cập nhật trạng thái thành công!');
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Lỗi cập nhật trạng thái');
    }
  };

  // Xử lý chuyển trang
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return; // Ngăn chuyển trang không hợp lệ
    setPage(newPage);
    fetchOrders(newPage);
  };

  // (Phần return giữ nguyên)
  return (
    <div className="p-4">
      <h3 className="text-primary fw-bold mb-4">Quản lý đơn hàng</h3>
      
      {/* BỘ LỌC THỜI GIAN */}
      <div className="d-flex flex-wrap gap-2 mb-3 p-3 bg-white rounded shadow-sm">
        <InputGroup size="sm" className="flex-grow-1" style={{ minWidth: '150px' }}>
          <Form.Select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="today">Hôm nay</option>
            <option value="yesterday">Hôm qua</option>
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="custom">Tùy chỉnh</option>
          </Form.Select>
        </InputGroup>
        
        {filter === 'custom' && (
          <>
            <FormControl 
              type="date" 
              size="sm" 
              value={customStart} 
              onChange={e => setCustomStart(e.target.value)} 
              className="flex-grow-1"
              style={{ minWidth: '150px' }}
            />
            <FormControl 
              type="date" 
              size="sm" 
              value={customEnd} 
              onChange={e => setCustomEnd(e.target.value)} 
              className="flex-grow-1"
              style={{ minWidth: '150px' }}
            />
          </>
        )}
      </div>
      
      <div className="table-responsive bg-white p-3 rounded shadow-sm">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Mã ĐH</th>
              <th>Khách hàng</th>
              <th>Ngày đặt</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-5">Đang tải...</td></tr>
            ) : orders.length > 0 ? (
              orders.map(order => (
                <tr key={order._id}>
                  <td>#{order._id.slice(-6)}</td>
                  <td>{order.user?.name || 'Guest'} ({order.user?.email})</td>
                  <td>{new Date(order.createdAt).toLocaleString()}</td>
                  <td>{order.total.toLocaleString()}đ</td>
                  <td>
                    <span className={`badge bg-${order.currentStatus === 'delivered' ? 'success' : (order.currentStatus === 'cancelled' ? 'danger' : 'warning')}`}>
                      {order.currentStatus}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => handleViewOrder(order._id)}
                    >
                      Xem
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" className="text-center py-5 text-muted">Không tìm thấy đơn hàng nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PHÂN TRANG */}
      {totalPages >= 1 && (
        <Pagination className="justify-content-center mt-4">
          <Pagination.Prev onClick={() => handlePageChange(page - 1)} disabled={page === 1} />
          {[...Array(totalPages)].map((_, i) => (
            <Pagination.Item 
              key={i + 1} 
              active={i + 1 === page} 
              onClick={() => handlePageChange(i + 1)}
            >
              {i + 1}
            </Pagination.Item>
          ))}
          <Pagination.Next onClick={() => handlePageChange(page + 1)} disabled={page === totalPages} />
        </Pagination>
      )}

      {/* Modal Chi Tiết Đơn Hàng */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Chi tiết đơn hàng #{selectedOrder?._id.slice(-6)}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && (
            <div>
              <p><strong>Khách hàng:</strong> {selectedOrder.user?.name}</p>
              <p><strong>Email:</strong> {selectedOrder.user?.email}</p>
              <p><strong>Địa chỉ:</strong> {selectedOrder.shippingAddress?.address} ({selectedOrder.shippingAddress?.name} - {selectedOrder.shippingAddress?.phone})</p>
              <p><strong>Ngày đặt:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
              <hr />
              <p>Tạm tính: {selectedOrder.subtotal.toLocaleString()}đ</p>
              <p className="text-danger">Giảm giá: -{selectedOrder.discount.toLocaleString()}đ</p>
              <p className="text-danger">Điểm đã dùng: -{(selectedOrder.loyaltyPointsUsed * 1000).toLocaleString()}đ ({selectedOrder.loyaltyPointsUsed} điểm)</p>
              <p>Thuế VAT: {selectedOrder.tax.toLocaleString()}đ</p>
              <p>Phí vận chuyển: {selectedOrder.shippingFee.toLocaleString()}đ</p>
              <h5 className="text-primary">Tổng cộng: {selectedOrder.total.toLocaleString()}đ</h5>
              <hr />
              
              <h5 className="mt-4">Sản phẩm</h5>
              <table className="table">
                <tbody>
                  {selectedOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td><img src={item.image} alt={item.name} width="50" /></td>
                      <td>{item.name}</td>
                      <td>{item.quantity} x {item.price.toLocaleString()}đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h5 className="mt-4">Cập nhật trạng thái</h5>
              <Form.Select 
                value={newStatus} 
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={selectedOrder.currentStatus === 'cancelled' || selectedOrder.currentStatus === 'delivered'}
              >
                <option value="pending">Pending (Đang chờ)</option>
                <option value="processing">Processing (Đang xử lý)</option>
                <option value="shipped">Shipped (Đang vận chuyển)</option>
                <option value="delivered">Delivered (Đã giao)</option>
                <option value="cancelled">Cancelled (Đã hủy)</option>
              </Form.Select>
              {(selectedOrder.currentStatus === 'cancelled' || selectedOrder.currentStatus === 'delivered') && (
                <Form.Text className="text-danger">
                  Không thể thay đổi trạng thái của đơn hàng đã Hủy hoặc đã Giao.
                </Form.Text>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Đóng
          </Button>
          <Button 
            variant="primary" 
            onClick={handleUpdateStatus} 
            disabled={selectedOrder?.currentStatus === 'cancelled' || selectedOrder?.currentStatus === 'delivered'}>
            Cập nhật
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Orders;