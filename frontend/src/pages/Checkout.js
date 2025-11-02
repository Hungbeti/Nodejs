// src/pages/Checkout.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const Checkout = () => {
  const [step, setStep] = useState(1);
  const [shipping, setShipping] = useState({ name: '', email: '', address: '' });
  const [payment, setPayment] = useState('cod');
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/cart').then(res => setCart(res.data));
    // Preload if logged in
    api.get('/profile').then(res => setShipping(res.data)).catch(() => {});
  }, []);

  const validateCoupon = async () => {
    try {
      const res = await api.get(`/coupons/validate/${coupon}`);
      if (res.data.valid) {
        setDiscount(res.data.discount);
        alert('Mã hợp lệ, giảm ' + res.data.discount.toLocaleString() + ' VND');
      } else {
        alert('Mã không hợp lệ hoặc hết lượt');
      }
    } catch (err) {
      alert('Lỗi kiểm tra mã');
    }
  };

  const placeOrder = async () => {
    try {
      const res = await api.post('/orders', { shipping, payment, coupon });
      setOrderId(res.data._id);
      setOrderSuccess(true);
    } catch (err) {
      alert('Lỗi đặt hàng');
    }
  };

  if (orderSuccess) {
    return (
      <div className="text-center mt-5">
        <h2>Đặt hàng thành công!</h2>
        <p>Mã đơn hàng: {orderId}</p>
        <p>Chúng tôi sẽ liên hệ sớm. Cảm ơn bạn!</p>
        <Link to="/" className="btn btn-primary">Quay về trang chủ</Link>
      </div>
    );
  }

  return (
    <div>
      <h2>Thanh toán</h2>
      <div className="progress mb-4" style={{ height: '20px' }}>
        <div className="progress-bar" style={{ width: `${(step / 3) * 100}%` }}></div>
      </div>

      {step === 1 && (
        <div>
          <h4>1. Thông tin giao hàng</h4>
          <input className="form-control mb-2" placeholder="Họ tên" value={shipping.name} onChange={e => setShipping({...shipping, name: e.target.value})} />
          <input className="form-control mb-2" placeholder="Email" value={shipping.email} onChange={e => setShipping({...shipping, email: e.target.value})} />
          <textarea className="form-control mb-2" placeholder="Địa chỉ" value={shipping.address} onChange={e => setShipping({...shipping, address: e.target.value})} />
          <button className="btn btn-primary" onClick={() => setStep(2)}>Tiếp theo</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h4>2. Phương thức thanh toán</h4>
          <div className="form-check">
            <input type="radio" className="form-check-input" value="cod" checked={payment === 'cod'} onChange={e => setPayment(e.target.value)} />
            <label>Thanh toán khi nhận hàng</label>
          </div>
          <div className="form-check">
            <input type="radio" className="form-check-input" value="bank" onChange={e => setPayment(e.target.value)} />
            <label>Chuyển khoản ngân hàng</label>
          </div>
          <button className="btn btn-secondary me-2" onClick={() => setStep(1)}>Quay lại</button>
          <button className="btn btn-primary" onClick={() => setStep(3)}>Tiếp theo</button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h4>3. Xác nhận</h4>
          <input className="form-control mb-2" placeholder="Mã giảm giá" value={coupon} onChange={e => setCoupon(e.target.value)} />
          <button className="btn btn-outline-primary mb-3" onClick={validateCoupon}>Kiểm tra</button>
          <p>Tổng: {cart.total.toLocaleString()} VND (giảm {discount.toLocaleString()} VND)</p>
          <button className="btn btn-secondary me-2" onClick={() => setStep(2)}>Quay lại</button>
          <button className="btn btn-success" onClick={placeOrder}>Xác nhận</button>
        </div>
      )}
    </div>
  );
};

export default Checkout;