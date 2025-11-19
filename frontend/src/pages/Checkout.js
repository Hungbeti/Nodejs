// src/pages/Checkout.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

// === LẤY CÁC HÀM TỪ CART CONTEXT ===
const getGuestCart = () => {
  const cart = localStorage.getItem('guestCart');
  return cart ? JSON.parse(cart) : []; 
};

const clearGuestCart = () => {
  localStorage.removeItem('guestCart');
};
// ======================================

// HÀM TÍNH TOÁN TỔNG TIỀN
const calculateTotals = (items, discount = 0) => {
  if (!Array.isArray(items)) {
    items = [];
  }
  const validItems = items.filter(item => item && item.product && typeof item.product.price === 'number');

  const subtotal = validItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const tax = subtotal * 0.1; // 10% VAT
  const shipping = 30000; // Fixed shipping
  const total = subtotal - discount + tax + shipping;
  return { items: validItems, subtotal, discount, tax, shipping, total };
};
// ======================================

const Checkout = () => {
  const [step, setStep] = useState(1);
  
  const [profileAddresses, setProfileAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [shipping, setShipping] = useState({ name: '', email: '', phone: '', addressLine: '' }); 
  
  const [payment, setPayment] = useState('cod');
  const [coupon, setCoupon] = useState(''); // State để lưu mã coupon
  
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({ subtotal: 0, discount: 0, tax: 0, shipping: 30000, total: 30000 });
  
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);

  const { isLoggedIn } = useAuth();
  const { fetchCartCount } = useCart();
  const navigate = useNavigate();
  const { state } = useLocation(); // Lấy state từ Cart.js

  useEffect(() => {
    // === NHẬN COUPON TỪ TRANG GIỎ HÀNG ===
    if (state && state.couponCode) {
      setCoupon(state.couponCode);
    }
    // ===================================

    const loadData = async () => {
      let cartData;
      let discount = state?.discount || 0; // Lấy discount từ state

      if (isLoggedIn) {
        // NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP
        try {
          const cartRes = await api.get('/cart');
          cartData = cartRes.data.items || [];
          
          const profileRes = await api.get('/profile');
          setShipping(s => ({ 
            ...s, 
            name: profileRes.data.name, 
            email: profileRes.data.email 
          }));
          setProfileAddresses(profileRes.data.addresses || []);
          setLoyaltyPoints(profileRes.data.loyaltyPoints || 0);

          if (profileRes.data.addresses.length > 0) {
            setSelectedAddress(profileRes.data.addresses[0]._id);
          } else {
            setSelectedAddress('new');
          }
        } catch (err) {
          console.error("Lỗi tải dữ liệu checkout:", err);
          navigate('/cart');
        }
      } else {
        // LÀ KHÁCH
        cartData = getGuestCart();
        if (cartData.length === 0) {
          navigate('/cart'); // Quay lại giỏ hàng nếu trống
        }
      }
      
      // Tính toán tổng tiền sau khi có dữ liệu giỏ hàng
      const calcs = calculateTotals(cartData, discount);
      setItems(cartData);
      setTotals(calcs);
    };
    
    loadData();
  }, [isLoggedIn, navigate, state]); // Thêm 'state' vào dependency

  const handleUsePointsChange = (e) => {
    const use = e.target.checked;
    setUsePoints(use);
    const pointsValue = loyaltyPoints * 1000;
    
    // Tính total TẠM THỜI (chưa trừ điểm)
    const currentTotal = totals.subtotal - totals.discount + totals.tax + totals.shipping;

    if (use) {
      const maxPointsValue = Math.min(pointsValue, currentTotal);
      setPointsToUse(Math.floor(maxPointsValue / 1000));
    } else {
      setPointsToUse(0);
    }
  };

  // HÀM NÀY GIỜ CHỈ ĐỂ VÔ HIỆU HÓA
  const applyCoupon = async () => {
    alert('Vui lòng áp dụng mã giảm giá ở trang Giỏ hàng.');
  };

  const placeOrder = async () => {
    try {
      let finalShippingAddress;
      if (isLoggedIn) {
        if (selectedAddress === 'new') {
          finalShippingAddress = {
            name: shipping.name,
            email: shipping.email,
            phone: shipping.phone,
            addressLine: shipping.addressLine // Sửa: Gửi addressLine
          };
        } else {
          const addr = profileAddresses.find(a => a._id === selectedAddress);
          finalShippingAddress = {
            name: addr.fullName,
            email: shipping.email,
            phone: addr.phone,
            addressLine: addr.addressLine // Sửa: Gửi addressLine
          };
        }
      } else {
        finalShippingAddress = shipping;
      }

      const orderData = {
        shipping: finalShippingAddress,
        payment: payment,
        couponCode: coupon, // Gửi mã coupon đã nhận từ Cart.js
        loyaltyPointsUsed: usePoints ? pointsToUse : 0,
      };

      if (!isLoggedIn) {
        orderData.items = items.map(item => ({
          productId: item.product._id, 
          quantity: item.quantity
        }));
      }

      const res = await api.post('/orders', orderData);
      setOrderId(res.data._id);
      setOrderSuccess(true);
      
      if (!isLoggedIn) {
        clearGuestCart();
      }
      
      fetchCartCount(); 
      
    } catch (err) {
      alert('Lỗi đặt hàng: ' + (err.response?.data?.msg || 'Lỗi server'));
    }
  };

  if (orderSuccess) {
    return (
      <div className="text-center mt-5">
        <h2>Đặt hàng thành công!</h2>
        <p>Mã đơn hàng: #{orderId.slice(-6)}</p>
        <p>Một email xác nhận đã được gửi. Cảm ơn bạn đã mua sắm!</p>
        <Link to="/" className="btn btn-primary">Quay về trang chủ</Link>
      </div>
    );
  }
  
  // Tính tổng tiền cuối cùng dựa trên state (1 điểm = 1000đ)
  const finalTotal = totals.total - (pointsToUse * 1000);

  return (
    <div>
      <h2>Thanh toán</h2>
      <div className="progress mb-4" style={{ height: '20px' }}>
        <div className="progress-bar" style={{ width: `${(step / 3) * 100}%` }}></div>
      </div>

      {/* === STEP 1: ĐỊA CHỈ === */}
      {step === 1 && (
        <div>
          <h4>1. Thông tin giao hàng</h4>
          
          {isLoggedIn ? (
            <div className="mb-3">
              <p>Email: <strong>{shipping.email}</strong></p>
              
              {profileAddresses.map(addr => (
                <div key={addr._id} className="form-check card bg-light p-3 mb-2">
                  <input 
                    type="radio" 
                    className="form-check-input" 
                    id={addr._id} 
                    name="addressSelection"
                    value={addr._id}
                    checked={selectedAddress === addr._id}
                    onChange={(e) => setSelectedAddress(e.target.value)}
                  />
                  <label className="form-check-label" htmlFor={addr._id}>
                    <strong>{addr.fullName}</strong> | {addr.phone}
                    <p className="mb-0 text-muted">{addr.addressLine}</p>
                  </label>
                </div>
              ))}
              
              <div className="form-check card p-3 mb-2">
                <input 
                  type="radio" 
                  className="form-check-input" 
                  id="new" 
                  name="addressSelection"
                  value="new"
                  checked={selectedAddress === 'new'}
                  onChange={(e) => setSelectedAddress(e.target.value)}
                />
                <label className="form-check-label" htmlFor="new">
                  <strong>Sử dụng địa chỉ khác</strong>
                </label>
              </div>

              {selectedAddress === 'new' && (
                <div className="mt-3 ps-4 border-start">
                  <input className="form-control mb-2" placeholder="Họ tên" value={shipping.name} onChange={e => setShipping({...shipping, name: e.target.value})} />
                  <input className="form-control mb-2" placeholder="Số điện thoại" value={shipping.phone} onChange={e => setShipping({...shipping, phone: e.target.value})} />
                  <textarea className="form-control mb-2" placeholder="Địa chỉ chi tiết" value={shipping.addressLine} onChange={e => setShipping({...shipping, addressLine: e.target.value})} />
                </div>
              )}
            </div>
          ) : (
            <div>
              <input className="form-control mb-2" placeholder="Họ tên" value={shipping.name} onChange={e => setShipping({...shipping, name: e.target.value})} required/>
              <input className="form-control mb-2" placeholder="Email" value={shipping.email} onChange={e => setShipping({...shipping, email: e.target.value})} required/>
              <input className="form-control mb-2" placeholder="Số điện thoại" value={shipping.phone} onChange={e => setShipping({...shipping, phone: e.target.value})} required/>
              <textarea className="form-control mb-2" placeholder="Địa chỉ chi tiết" value={shipping.addressLine} onChange={e => setShipping({...shipping, addressLine: e.target.value})} required/>
            </div>
          )}

          <button className="btn btn-primary" onClick={() => setStep(2)}>Tiếp theo</button>
        </div>
      )}

      {/* === STEP 2: THANH TOÁN === */}
      {step === 2 && (
        <div>
          <h4>2. Phương thức thanh toán</h4>
          <div className="form-check">
            <input type="radio" className="form-check-input" id="cod" value="cod" checked={payment === 'cod'} onChange={e => setPayment(e.target.value)} />
            <label className="form-check-label" htmlFor="cod">Thanh toán khi nhận hàng (COD)</label>
          </div>
          <div className="form-check">
            <input type="radio" className="form-check-input" id="bank" value="bank" disabled onChange={e => setPayment(e.target.value)} />
            <label className="form-check-label" htmlFor="bank">Chuyển khoản ngân hàng (Bảo trì)</label>
          </div>
          <button className="btn btn-secondary me-2 mt-3" onClick={() => setStep(1)}>Quay lại</button>
          <button className="btn btn-primary mt-3" onClick={() => setStep(3)}>Tiếp theo</button>
        </div>
      )}

      {/* === STEP 3: XÁC NHẬN === */}
      {step === 3 && (
        <div>
          <h4>3. Xác nhận</h4>
          {/* === VÔ HIỆU HÓA Ô COUPON === */}
          <input 
            className="form-control mb-3" 
            placeholder="Mã giảm giá (Đã áp dụng ở giỏ hàng)" 
            value={coupon} 
            readOnly 
            disabled 
          />
          {/* ========================== */}
          
          {isLoggedIn && loyaltyPoints > 0 && (
            <div className="form-check my-3">
              <input 
                type="checkbox" 
                className="form-check-input" 
                id="usePoints" 
                checked={usePoints} 
                onChange={handleUsePointsChange} 
              />
              <label className="form-check-label" htmlFor="usePoints">
                Dùng {loyaltyPoints.toLocaleString()} điểm (tương đương {(loyaltyPoints * 1000).toLocaleString()}đ)
              </label>
            </div>
          )}

          <p>Tạm tính: {totals.subtotal.toLocaleString()} VND</p>
          <p className="text-success">Giảm giá: -{totals.discount.toLocaleString()} VND</p>
          {usePoints && <p className="text-success">Giảm từ điểm: -{(pointsToUse * 1000).toLocaleString()} VND</p>}
          <p>Thuế VAT: {totals.tax.toLocaleString()} VND</p>
          <p>Vận chuyển: {totals.shipping.toLocaleString()} VND</p>
          
          <h5 className="text-primary">Tổng cộng: {finalTotal.toLocaleString()} VND</h5>
          
          <button className="btn btn-secondary me-2" onClick={() => setStep(2)}>Quay lại</button>
          <button className="btn btn-success" onClick={placeOrder}>Xác nhận</button>
        </div>
      )}
    </div>
  );
};

export default Checkout;