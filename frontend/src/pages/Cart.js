// src/pages/Cart.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import socket from '../socket';
import { useCart } from '../context/CartContext';

const Cart = () => {
  const [cart, setCart] = useState({ items: [], subtotal: 0, discount: 0, tax: 0, shipping: 0, total: 0 });
  const [coupon, setCoupon] = useState('');
  const [error, setError] = useState('');
  const { fetchCartCount } = useCart();

  useEffect(() => {
    loadCart();
    socket.on('cartUpdated', loadCart);
    return () => socket.off('cartUpdated');
  }, []);

  const loadCart = async () => {
    try {
      const res = await api.get('/cart');
      const items = res.data.items || [];
      const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const discount = res.data.discount || 0;
      const tax = subtotal * 0.1; // 10% VAT
      const shipping = 30000; // Fixed shipping
      const total = subtotal - discount + tax + shipping;
      setCart({ items, subtotal, discount, tax, shipping, total });
      fetchCartCount();
    } catch (err) {
      setCart({ items: [], subtotal: 0, discount: 0, tax: 0, shipping: 0, total: 0 });
    }
  };

  const updateQuantity = async (id, qty) => {
    if (qty < 1) return removeItem(id);
    try {
      await api.put('/cart/update', { productId: id, quantity: qty });
      socket.emit('cartUpdate');
    } catch (err) {
      alert('Lỗi cập nhật');
    }
  };

  const removeItem = async (id) => {
    try {
      await api.delete(`/cart/remove/${id}`);
      socket.emit('cartUpdate');
    } catch (err) {
      alert('Lỗi xóa');
    }
  };

  const applyCoupon = async () => {
    try {
      const res = await api.post('/cart/apply-coupon', { code: coupon });
      setCart(prev => ({ ...prev, discount: res.data.discount, total: prev.subtotal + prev.tax + prev.shipping - res.data.discount }));
      setError('');
      alert('Áp dụng thành công!');
    } catch (err) {
      setError(err.response?.data?.message || 'Mã không hợp lệ');
    }
  };

  return (
    <div className="container my-4">
      <h2>Giỏ hàng ({cart.items.length})</h2>
      <div className="row">
        <div className="col-md-8">
          {cart.items.map(item => (
            <div key={item.product._id} className="card mb-3">
              <div className="card-body d-flex align-items-center">
                <input type="checkbox" className="me-3" checked />
                <img src={item.product.images[0]} alt={item.product.name} style={{ width: '80px' }} className="me-3" />
                <div className="flex-grow-1">
                  <h6>{item.product.name}</h6>
                  <p className="text-muted">SKU: {item.product.sku}</p>
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

        <div className="col-md-4">
          <div className="card">
            <div className="card-header">Thanh toán</div>
            <div className="card-body">
              <div className="input-group mb-3">
                <input className="form-control" placeholder="Mã giảm giá" value={coupon} onChange={e => setCoupon(e.target.value)} />
                <button className="btn btn-outline-primary" onClick={applyCoupon}>Áp dụng</button>
              </div>
              {error && <p className="text-danger">{error}</p>}
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex justify-content-between"><span>Tạm tính</span><span>{cart.subtotal.toLocaleString()}đ</span></li>
                <li className="list-group-item d-flex justify-content-between text-success"><span>Giảm giá</span><span>- {cart.discount.toLocaleString()}đ</span></li>
                <li className="list-group-item d-flex justify-content-between"><span>Thuế VAT</span><span>{cart.tax.toLocaleString()}đ</span></li>
                <li className="list-group-item d-flex justify-content-between"><span>Phí vận chuyển</span><span>{cart.shipping.toLocaleString()}đ</span></li>
                <li className="list-group-item d-flex justify-content-between fw-bold"><span>Thành tiền</span><span className="text-primary">{cart.total.toLocaleString()}đ</span></li>
              </ul>
              <Link to="/checkout" className="btn btn-primary w-100 mt-3">TIẾP TỤC</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;