// src/pages/Cart.js
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
// import socket from '../socket'; // Tạm thời vô hiệu hóa socket
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Modal, Button, ListGroup, Badge } from 'react-bootstrap';

// === LẤY CÁC HÀM TỪ CART CONTEXT ===
// (Đây là các hàm xử lý localStorage cho khách)
const getGuestCart = () => {
  const cart = localStorage.getItem('guestCart');
  return cart ? JSON.parse(cart) : []; 
};

const saveGuestCart = (items) => {
  localStorage.setItem('guestCart', JSON.stringify(items));
};

const getCartCount = (items) => {
  return items.reduce((sum, item) => sum + item.quantity, 0);
};
// ======================================

const Cart = () => {
  const [cart, setCart] = useState({ items: [], subtotal: 0, discount: 0, tax: 0, shipping: 0, total: 0 });
  const [coupon, setCoupon] = useState('');
  const [error, setError] = useState('');
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  
  // Lấy các hàm/trạng thái cần thiết
  const { fetchCartCount } = useCart();
  const { isLoggedIn } = useAuth(); // 2. LẤY TRẠNG THÁI ĐĂNG NHẬP
  const navigate = useNavigate();

  // Tải danh sách coupon khả dụng
  const fetchCoupons = async () => {
    try {
      const { data } = await api.get('/coupons/available');
      setAvailableCoupons(data);
      setShowCouponModal(true);
    } catch (err) {
      console.error('Lỗi tải coupons:', err);
    }
  };

  // Chọn coupon từ danh sách
  const handleSelectCoupon = (code) => {
    setCoupon(code); // Điền mã vào ô input
    setShowCouponModal(false);
    // Tùy chọn: Tự động gọi applyCoupon() luôn ở đây nếu muốn
  };

  // TÍNH TOÁN TỔNG TIỀN (Helper)
  const calculateTotals = (items, discount = 0) => {
    const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const tax = subtotal * 0.1; // 10% VAT
    const shipping = 30000; // Fixed shipping
    const total = subtotal - discount + tax + shipping;
    return { items, subtotal, discount, tax, shipping, total };
  };

  // 3. NÂNG CẤP loadCart
  const loadCart = async () => {
    try {
      if (isLoggedIn) {
        // ĐÃ ĐĂNG NHẬP: Tải từ API (như cũ)
        const res = await api.get('/cart');
        const calcs = calculateTotals(res.data.items || [], res.data.discount);
        setCart(calcs);
      } else {
        // LÀ KHÁCH: Tải từ localStorage
        const items = getGuestCart();
        const calcs = calculateTotals(items, 0); // Khách không có discount
        setCart(calcs);
      }
      fetchCartCount(); // Cập nhật lại số lượng (dù không cần thiết nhưng để cho chắc)
    } catch (err) {
      // Lỗi 401 sẽ rơi vào đây nếu là khách (như cũ)
      // Nhưng giờ chúng ta đã xử lý khách ở trên
      setCart(calculateTotals([], 0)); // Đặt về rỗng
    }
  };

  useEffect(() => {
    loadCart();
    // socket.on('cartUpdated', loadCart);
    // return () => socket.off('cartUpdated');
  }, [isLoggedIn]); // Thêm isLoggedIn làm dependency

  // 4. NÂNG CẤP updateQuantity
  const updateQuantity = async (productId, qty) => {
    if (qty < 1) return removeItem(productId);
    try {
      if (isLoggedIn) {
        await api.put('/cart/update', { productId: productId, quantity: qty });
        // socket.emit('cartUpdate');
      } else {
        const items = getGuestCart();
        const item = items.find(i => i.product._id === productId);
        if (item) {
          item.quantity = qty;
          saveGuestCart(items);
        }
      }
      loadCart(); // Tải lại state của giỏ hàng
    } catch (err) {
      alert('Lỗi cập nhật');
    }
  };

  // 5. NÂNG CẤP removeItem
  const removeItem = async (productId) => {
    try {
      if (isLoggedIn) {
        await api.delete(`/cart/remove/${productId}`);
        // socket.emit('cartUpdate');
      } else {
        let items = getGuestCart();
        items = items.filter(i => i.product._id !== productId);
        saveGuestCart(items);
      }
      loadCart(); // Tải lại state của giỏ hàng
    } catch (err) {
      alert('Lỗi xóa');
    }
  };

  const applyCoupon = async () => {
    // Chỉ cho phép khi đã đăng nhập
    // if (!isLoggedIn) {
    //   setError('Vui lòng đăng nhập để dùng mã giảm giá');
    //   return;
    // }
    try {
      const res = await api.post('/coupons/validate', { code: coupon, orderTotal: cart.subtotal, cartItems: cart.items });
      setCart(prev => ({ ...prev, discount: res.data.discountAmount, total: prev.subtotal + prev.tax + prev.shipping - res.data.discountAmount }));
      setError('');
      alert('Áp dụng thành công!');
    } catch (err) {
      setCart(prev => ({ 
        ...prev, 
        discount: 0, 
        total: prev.subtotal + prev.tax + prev.shipping 
      }));
      setError(err.response?.data?.msg || 'Mã không hợp lệ');
    }
  };

  const handleCheckout = async () => {
    try {
      let response;
      if (isLoggedIn) {
        // Nếu đã đăng nhập, backend sẽ tự tìm giỏ hàng qua token
        response = await api.post('/cart/check-stock');
      } else {
        // Nếu là khách, gửi giỏ hàng localStorage lên
        const guestCart = getGuestCart();
        const payload = guestCart.map(item => ({
          productId: item.product._id,
          quantity: item.quantity
        }));
        response = await api.post('/cart/check-stock', { items: payload });
      }

      // Nếu API trả về success: true
      if (response.data.success) {
        navigate('/checkout'); // Điều hướng đến trang thanh toán
      }
      
    } catch (err) {
      // Nếu API trả về lỗi 400 (hết hàng)
      alert(err.response?.data?.msg || 'Không thể thanh toán. Vui lòng thử lại.');
    }
  };

  // 6. SỬA LẠI KEY VÀ ID SẢN PHẨM
  return (
    <div className="container my-4">
      {/* Hiển thị số lượng từ state, không phải cart.items.length */}
      <h2>Giỏ hàng ({cart.items.reduce((sum, item) => sum + item.quantity, 0)})</h2>
      <div className="row">
        <div className="col-md-8">
          {cart.items.map(item => (
            // Key và ID phải dùng product._id
            <div key={item.product._id} className="card mb-3"> 
              <div className="card-body d-flex align-items-center">
                <input type="checkbox" className="me-3" checked />
                <img src={item.product.images[0]} alt={item.product.name} style={{ width: '80px' }} className="me-3" />
                <div className="flex-grow-1">
                  <h6>{item.product.name}</h6>
                  <p className="text-muted">SKU: {item.product.sku || 'N/A'}</p>
                  <p className="text-primary">{item.product.price.toLocaleString()}đ</p>
                </div>
                <div className="d-flex align-items-center me-3">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => updateQuantity(item.product._id, item.quantity - 1)}>-</button>
                  <span className="mx-2">{item.quantity}</span>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => updateQuantity(item.product._id, item.quantity + 1)}>+</button>
                </div>
                <h6 className="me-3">{(item.product.price * item.quantity).toLocaleString()}đ</h6>
                <button className="btn btn-sm btn-outline-danger" onClick={() => removeItem(item.product._id)}>Xóa</button>
              </div>
            </div>
          ))}
        </div>

        {/* ... (Phần thanh toán giữ nguyên) ... */}
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">Thanh toán</div>
            <div className="card-body">

              <div className="input-group mb-2">
                <input 
                  className="form-control" 
                  placeholder="Mã giảm giá" 
                  value={coupon} 
                  onChange={e => setCoupon(e.target.value.toUpperCase())} 
                />
                <button className="btn btn-outline-primary" onClick={applyCoupon}>Áp dụng</button>
              </div>
              <button 
                className="btn btn-link p-0 text-decoration-none mb-3"
                onClick={fetchCoupons}
              >
                <i className="bi bi-tags-fill me-1"></i>Xem mã giảm giá có sẵn
              </button>

              {error && <p className="text-danger">{error}</p>}
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex justify-content-between"><span>Tạm tính</span><span>{cart.subtotal.toLocaleString()}đ</span></li>
                <li className="list-group-item d-flex justify-content-between text-success"><span>Giảm giá</span><span>- {cart.discount.toLocaleString()}đ</span></li>
                <li className="list-group-item d-flex justify-content-between"><span>Thuế VAT</span><span>{cart.tax.toLocaleString()}đ</span></li>
                <li className="list-group-item d-flex justify-content-between"><span>Phí vận chuyển</span><span>{cart.shipping.toLocaleString()}đ</span></li>
                <li className="list-group-item d-flex justify-content-between fw-bold"><span>Thành tiền</span><span className="text-primary">{cart.total.toLocaleString()}đ</span></li>
              </ul>
              {/* <Link to="/checkout" className="btn btn-primary w-100 mt-3">TIẾP TỤC</Link> */}
              <button 
                onClick={handleCheckout} 
                className="btn btn-primary w-100 mt-3"
                disabled={cart.items.length === 0} // Vô hiệu hóa nếu giỏ trống
              >
                TIẾP TỤC
              </button>

            </div>
          </div>
        </div>
      </div>
      {/* === MODAL DANH SÁCH MÃ GIẢM GIÁ === */}
      <Modal show={showCouponModal} onHide={() => setShowCouponModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Mã giảm giá dành cho bạn</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ListGroup variant="flush">
            {availableCoupons.map(cp => (
              <ListGroup.Item key={cp._id} action onClick={() => handleSelectCoupon(cp.code)}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1 text-primary fw-bold">{cp.code}</h6>
                    <small className="text-muted">
                      Giảm {cp.type === 'percent' ? `${cp.value}%` : `${cp.value.toLocaleString()}đ`}
                      {cp.minOrderValue > 0 && ` cho đơn từ ${cp.minOrderValue.toLocaleString()}đ`}
                    </small>
                    <br/>
                    <small className="text-muted">
                      Áp dụng: {cp.applicableCategories.length === 0 
                        ? 'Tất cả sản phẩm' 
                        : cp.applicableCategories.map(c => c.name).join(', ')}
                    </small>
                  </div>
                  <Badge bg="success" pill>Dùng ngay</Badge>
                </div>
              </ListGroup.Item>
            ))}
            {availableCoupons.length === 0 && (
              <p className="text-center text-muted my-3">Hiện không có mã giảm giá nào.</p>
            )}
          </ListGroup>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Cart;