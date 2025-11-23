// src/pages/MyOrders.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await api.get('/orders/my-orders');
        setOrders(data);
      } catch (err) {
        console.error('Lỗi tải đơn hàng');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const fetchOrderDetail = async (id) => {
    try {
      const { data } = await api.get(`/orders/my-orders/${id}`);
      setSelectedOrder(data);
    } catch (err) {
      console.error('Lỗi tải chi tiết đơn hàng');
    }
  };

  const handleCancelOrder = async () => {
    if (window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này? Hành động này không thể hoàn tác.')) {
      try {
        await api.patch(`/orders/my-orders/${selectedOrder._id}/cancel`);
        toast.success('Đã hủy đơn hàng thành công');
        fetchOrderDetail(selectedOrder._id);
      } catch (err) {
        toast.error(err.response?.data?.msg || 'Lỗi hủy đơn hàng');
      }
    }
  };

  if (loading) return <div>Đang tải...</div>;

  // === GIAO DIỆN CHI TIẾT ĐƠN HÀNG (ĐÃ CẬP NHẬT) ===
  if (selectedOrder) {
    const canCancel = selectedOrder.currentStatus === 'pending' || selectedOrder.currentStatus === 'processing';
    const { shippingAddress } = selectedOrder;

    return (
      <div>
        <button className="btn btn-outline-secondary mb-3" onClick={() => setSelectedOrder(null)}>
          &larr; Quay lại danh sách
        </button>
        {canCancel && (
          <button 
              className="btn btn-danger mb-3 ms-2"
              onClick={handleCancelOrder}
          >
            <i className="bi bi-x-circle me-1"></i> Hủy đơn hàng
          </button>
        )}
        
        <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Chi tiết đơn hàng #{selectedOrder._id.slice(-6)}</h3>
            <span className={`badge bg-${selectedOrder.currentStatus === 'cancelled' ? 'danger' : 'primary'} fs-6`}>
                {selectedOrder.currentStatus.toUpperCase()}
            </span>
        </div>

        {/* 1. THÊM THÔNG TIN GIAO HÀNG */}
        <div className="card mb-4">
            <div className="card-header fw-bold bg-light">Thông tin nhận hàng</div>
            <div className="card-body">
                <div className="row">
                    <div className="col-md-4">
                        <strong>Người nhận:</strong><br />
                        {shippingAddress?.name}
                    </div>
                    <div className="col-md-4">
                        <strong>Số điện thoại:</strong><br />
                        {shippingAddress?.phone}
                    </div>
                    <div className="col-md-4">
                        <strong>Địa chỉ:</strong><br />
                        {shippingAddress?.address}
                    </div>
                </div>
            </div>
        </div>
        
        <h5 className="mt-4">Sản phẩm</h5>
        <div className="table-responsive">
            <table className="table align-middle">
            <thead className="table-light">
                <tr>
                    <th>Sản phẩm</th>
                    <th className="text-center">Số lượng</th>
                    <th className="text-end">Đơn giá</th>
                    <th className="text-end">Thành tiền</th>
                </tr>
            </thead>
            <tbody>
                {selectedOrder.items.map(item => (
                <tr key={item.product._id}>
                    {/* 2. THÊM HÌNH ẢNH SẢN PHẨM */}
                    <td>
                        <div className="d-flex align-items-center">
                            <img 
                                src={item.product.images?.[0] || 'https://via.placeholder.com/50'} 
                                alt={item.product.name}
                                style={{ width: '60px', height: '60px', objectFit: 'cover', marginRight: '15px', borderRadius: '4px', border: '1px solid #eee' }} 
                            />
                            <div>
                                <div className="fw-bold">{item.product.name}</div>
                            </div>
                        </div>
                    </td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-end">{item.product.price.toLocaleString()}đ</td>
                    <td className="text-end">{(item.product.price * item.quantity).toLocaleString()}đ</td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>

        {/* 3. PHẦN TỔNG CỘNG CHI TIẾT */}
        <div className="row mt-3">
            <div className="col-md-6">
                <h5 className="mt-4">Lịch sử trạng thái</h5>
                <table className="table table-sm table-bordered">
                    <thead className="table-light">
                        <tr><th>Trạng thái</th><th>Thời gian</th></tr>
                    </thead>
                    <tbody>
                        {[...selectedOrder.statusHistory].reverse().map((status, idx) => (
                        <tr key={idx}>
                            <td>{status.status}</td>
                            <td>{new Date(status.timestamp).toLocaleString()}</td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="col-md-6">
                <div className="card bg-light p-3">
                    <div className="d-flex justify-content-between mb-2">
                        <span>Tạm tính:</span>
                        <span className="fw-bold">{selectedOrder.subtotal?.toLocaleString()}đ</span>
                    </div>
                    
                    <div className="d-flex justify-content-between mb-2">
                        <span>Phí vận chuyển:</span>
                        <span>+{selectedOrder.shippingFee?.toLocaleString()}đ</span>
                    </div>

                    <div className="d-flex justify-content-between mb-2">
                        <span>Thuế (10%):</span>
                        <span>+{selectedOrder.tax?.toLocaleString()}đ</span>
                    </div>

                    {/* Hiển thị mã giảm giá nếu có */}
                    {selectedOrder.discount > 0 && (
                        <div className="d-flex justify-content-between mb-2 text-success">
                            <span>Mã giảm giá {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''}:</span>
                            <span>-{selectedOrder.discount.toLocaleString()}đ</span>
                        </div>
                    )}

                    {/* Hiển thị điểm thân thiết nếu có */}
                    {selectedOrder.loyaltyPointsUsed > 0 && (
                        <div className="d-flex justify-content-between mb-2 text-success">
                            <span>Điểm thân thiết (-{selectedOrder.loyaltyPointsUsed} điểm):</span>
                            <span>-{(selectedOrder.loyaltyPointsUsed * 1000).toLocaleString()}đ</span>
                        </div>
                    )}

                    <hr />
                    
                    <div className="d-flex justify-content-between align-items-center">
                        <span className="h5 mb-0">Tổng cộng:</span>
                        <span className="h4 text-primary mb-0 fw-bold">{selectedOrder.total.toLocaleString()}đ</span>
                    </div>
                    
                    <div className="text-end mt-2 text-muted small">
                         (Bạn tích lũy được <span className="text-success fw-bold">+{selectedOrder.loyaltyPointsEarned}</span> điểm từ đơn này)
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // Giao diện danh sách đơn hàng (Giữ nguyên)
  return (
    <div>
      <h3>Đơn hàng của bạn</h3>
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Mã ĐH</th>
            <th>Ngày đặt</th>
            <th>Tổng tiền</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order._id}>
              <td>#{order._id.slice(-6)}</td>
              <td>{new Date(order.createdAt).toLocaleDateString()}</td>
              <td>{order.total.toLocaleString()}đ</td>
              <td>
                <span className={`badge bg-${order.currentStatus === 'cancelled' ? 'danger' : 'primary'}`}>
                    {order.currentStatus}
                </span>
              </td>
              <td>
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => fetchOrderDetail(order._id)}
                >
                  Xem chi tiết
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MyOrders;