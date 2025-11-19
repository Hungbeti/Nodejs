// src/pages/MyOrders.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

  // === 2. THÊM HÀM HỦY ĐƠN HÀNG ===
  const handleCancelOrder = async () => {
    if (window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này? Hành động này không thể hoàn tác.')) {
      try {
        await api.patch(`/orders/my-orders/${selectedOrder._id}/cancel`);
        toast.success('Đã hủy đơn hàng thành công');
        // Tải lại chi tiết đơn hàng để cập nhật trạng thái
        fetchOrderDetail(selectedOrder._id);
        
        // Tải lại danh sách đơn hàng (để cập nhật trạng thái ở trang trước)
        // (Không bắt buộc, nhưng nên có nếu bạn quay lại)
        // fetchOrders(); // Bạn cần định nghĩa fetchOrders ở ngoài useEffect
      } catch (err) {
        toast.error(err.response?.data?.msg || 'Lỗi hủy đơn hàng');
      }
    }
  };

  if (loading) return <div>Đang tải...</div>;

  // Giao diện xem chi tiết đơn hàng
  if (selectedOrder) {
    const canCancel = selectedOrder.currentStatus === 'pending' || selectedOrder.currentStatus === 'processing';
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
        <h3>Chi tiết đơn hàng #{selectedOrder._id.slice(-6)}</h3>
        <p>Ngày đặt: {new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
        <p>Trạng thái hiện tại: <span className="badge bg-primary">{selectedOrder.currentStatus}</span></p>
        
        <h5 className="mt-4">Sản phẩm</h5>
        <table className="table">
          <tbody>
            {selectedOrder.items.map(item => (
              <tr key={item.product._id}>
                <td>{item.product.name}</td>
                <td>{item.quantity} x {item.product.price.toLocaleString()}đ</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <h5 className="mt-4">Lịch sử trạng thái</h5>
        <table className="table table-sm">
          <thead>
            <tr><th>Trạng thái</th><th>Thời gian</th></tr>
          </thead>
          <tbody>
            {/* Sắp xếp đảo ngược */}
            {[...selectedOrder.statusHistory].reverse().map((status, idx) => (
              <tr key={idx}>
                <td>{status.status}</td>
                <td>{new Date(status.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h5 className="mt-4">Tổng cộng</h5>
        {selectedOrder.loyaltyPointsUsed > 0 && (
           <p>
             Điểm đã dùng: 
             <span className="text-danger ms-2">
               -{selectedOrder.loyaltyPointsUsed} điểm 
               (-{(selectedOrder.loyaltyPointsUsed * 1000).toLocaleString()}đ)
             </span>
           </p>
        )}
        <p>Điểm kiếm được: <span className="text-success">+{selectedOrder.loyaltyPointsEarned}</span></p>
        <p>Tổng tiền: <strong className="text-primary">{selectedOrder.total.toLocaleString()}đ</strong></p>
      </div>
    );
  }

  // Giao diện danh sách đơn hàng
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
              <td><span className="badge bg-primary">{order.currentStatus}</span></td>
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