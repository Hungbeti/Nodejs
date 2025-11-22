// src/pages/Checkout.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { toast } from 'react-toastify';

const getGuestCart = () => {
  const cart = localStorage.getItem('guestCart');
  return cart ? JSON.parse(cart) : []; 
};
const clearGuestCart = () => { localStorage.removeItem('guestCart'); };

const calculateTotals = (items, discount = 0) => {
  if (!Array.isArray(items)) items = [];
  const validItems = items.filter(item => item && item.product && typeof item.product.price === 'number');
  const subtotal = validItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const tax = subtotal * 0.1; 
  const shipping = 30000; 
  const total = subtotal - discount + tax + shipping;
  return { items: validItems, subtotal, discount, tax, shipping, total };
};

const Checkout = () => {
  const [step, setStep] = useState(1);
  const [userEmail, setUserEmail] = useState(''); // State này cần được cập nhật!
  
  const [profileAddresses, setProfileAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [shipping, setShipping] = useState({ name: '', email: '', phone: '', addressLine: '' }); 
  
  const [payment, setPayment] = useState('cod');
  const [coupon, setCoupon] = useState(''); 
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
  const { state } = useLocation(); 

  useEffect(() => {
    if (state && state.couponCode) setCoupon(state.couponCode);

    const loadData = async () => {
      let cartData;
      let discount = state?.discount || 0;

      // 1. XỬ LÝ GIỎ HÀNG (Items)
      if (state && state.selectedItems && state.selectedItems.length > 0) {
          cartData = state.selectedItems;
      } else if (isLoggedIn) {
          try {
            const cartRes = await api.get('/cart');
            cartData = cartRes.data.items || [];
          } catch (err) {
            console.error("Lỗi tải giỏ hàng:", err);
            navigate('/cart');
            return;
          }
      } else {
          cartData = getGuestCart();
          if (cartData.length === 0) return navigate('/cart');
      }
      
      // Tính toán tổng tiền
      const calcs = calculateTotals(cartData, discount);
      setItems(cartData);
      setTotals(calcs);

      // 2. XỬ LÝ PROFILE (Địa chỉ) - TÁCH RA ĐỂ LUÔN CHẠY
      if (isLoggedIn) {
        try {
          const profileRes = await api.get('/profile');
          const userData = profileRes.data;
          
          setUserEmail(userData.email);
          const addresses = userData.addresses || [];
          setProfileAddresses(addresses);
          setLoyaltyPoints(userData.loyaltyPoints || 0);

          // Logic chọn địa chỉ mặc định
          if (addresses.length > 0) {
             const defaultAddr = addresses.find(a => a.isDefault);
             setSelectedAddress(defaultAddr ? defaultAddr._id : addresses[0]._id);
          } else {
             setSelectedAddress('new');
             setShipping(s => ({ ...s, name: userData.name, email: userData.email }));
          }
        } catch (err) {
          console.error("Lỗi tải profile:", err);
        }
      }
    };

    loadData();
  }, [isLoggedIn, navigate, state]);

  const handleUsePointsChange = (e) => {
    const use = e.target.checked;
    setUsePoints(use);
    const pointsValue = loyaltyPoints * 1000;
    const currentTotal = totals.subtotal - totals.discount + totals.tax + totals.shipping;
    if (use) {
      const maxPointsValue = Math.min(pointsValue, currentTotal);
      setPointsToUse(Math.floor(maxPointsValue / 1000));
    } else {
      setPointsToUse(0);
    }
  };

  const placeOrder = async () => {
    try {
      const finalTotal = totals.total - (usePoints ? pointsToUse * 1000 : 0);
      if (finalTotal < 0) return toast.error('Tổng tiền không hợp lệ');

      let shippingAddress;  // Đổi tên biến để khớp backend

      // Nếu dùng địa chỉ mới hoặc chưa đăng nhập
      if (selectedAddress === 'new' || !isLoggedIn) {
        if (!shipping.name || !shipping.addressLine || (!isLoggedIn && !shipping.email)) {
          return toast.error('Vui lòng điền đầy đủ thông tin giao hàng');
        }
        shippingAddress = {
          name: shipping.name,
          email: shipping.email || userEmail,
          phone: shipping.phone,
          address: shipping.addressLine  // Backend dùng 'address'
        };
      } else {
        // Dùng địa chỉ có sẵn từ profile
        const addr = profileAddresses.find(a => a._id === selectedAddress);
        if (!addr) return toast.error('Không tìm thấy địa chỉ đã chọn');

        shippingAddress = {
          name: addr.fullName,
          email: userEmail,
          phone: addr.phone,
          address: addr.addressLine
        };
      }

      const orderData = {
        items: items.map(i => ({
          product: i.product._id,
          name: i.product.name,
          quantity: i.quantity,
          price: i.product.price
        })),
        shippingAddress: shippingAddress,  // ← Key đúng là shippingAddress
        paymentMethod: payment,
        couponCode: coupon || undefined,
        usePoints: usePoints ? pointsToUse : 0
      };

      // Bonus: Log để debug (xóa sau khi test xong)
      console.log('Order data gửi đi:', orderData);

      const res = await api.post('/orders', orderData);
      setOrderId(res.data._id);
      setOrderSuccess(true);

      if (isLoggedIn) {
        // await api.delete('/cart/clear');
        try {
          await api.delete('/cart/clear');
        } catch (deleteErr) {
          console.warn('Lỗi xóa giỏ hàng:', deleteErr);
        }
      } else {
        clearGuestCart();
      }
      
      fetchCartCount();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Lỗi đặt hàng");
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
  
  const finalTotal = totals.total - (pointsToUse * 1000);

  const canProceedStep1 = () => {
    if (!isLoggedIn && selectedAddress === 'new') {
      return shipping.name && shipping.phone && shipping.addressLine && shipping.email;
    }
    if (selectedAddress === 'new') {
      return shipping.name && shipping.phone && shipping.addressLine;
    }
    return selectedAddress && selectedAddress !== '';
  };

  // Xử lý nút "Tiếp theo"
  const handleNextStep = () => {
    if (!canProceedStep1()) {
      toast.error('Vui lòng chọn hoặc nhập đầy đủ thông tin giao hàng');
      return;
    }

    // Tự động điền email nếu dùng địa chỉ có sẵn (rất quan trọng để tránh lỗi 500)
    if (selectedAddress !== 'new' && profileAddresses.length > 0) {
      const addr = profileAddresses.find(a => a._id === selectedAddress);
      if (addr) {
        setShipping({
          name: addr.fullName,
          email: userEmail,           // ← Đây là thứ cứu lỗi shippingAddress.email required!
          phone: addr.phone || '',
          addressLine: addr.addressLine
        });
      }
    }

    setStep(2);
  };

  return (
    <div>
      <h2>Thanh toán</h2>
      <div className="progress mb-4" style={{ height: '20px' }}>
        <div className="progress-bar" style={{ width: `${(step / 3) * 100}%` }}></div>
      </div>

      {/* === STEP 1: THÔNG TIN GIAO HÀNG === */}
      {step === 1 && (
        <div>
          <h4>1. Thông tin giao hàng</h4>
          <p>Tài khoản: <strong>{userEmail || 'Khách vãng lai'}</strong></p>

          {/* HIỂN THỊ ĐỊA CHỈ CÓ SẴN (nếu đã đăng nhập) */}
          {isLoggedIn && profileAddresses.length > 0 && (
            <>
              <p className="text-muted mb-3">Chọn địa chỉ giao hàng:</p>
              {profileAddresses.map(addr => (
                <div key={addr._id} className={`card p-3 mb-3 cursor-pointer ${selectedAddress === addr._id ? 'border-primary border-2' : ''}`}
                    onClick={() => setSelectedAddress(addr._id)}
                    style={{ cursor: 'pointer' }}>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="savedAddress"
                      id={`addr-${addr._id}`}
                      checked={selectedAddress === addr._id}
                      onChange={() => setSelectedAddress(addr._id)}
                    />
                    <label className="form-check-label w-100" htmlFor={`addr-${addr._id}`}>
                      <div className="d-flex justify-content-between">
                        <div>
                          <strong>{addr.fullName}</strong> | {addr.phone}
                          {addr.isDefault && <span className="badge bg-success ms-2">Mặc định</span>}
                          <div className="text-muted small mt-1">{addr.addressLine}</div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              ))}
              
              <hr className="my-4" />
            </>
          )}

          {/* DÙNG ĐỊA CHỈ MỚI */}
          <div className="form-check mb-4">
            <input
              className="form-check-input"
              type="radio"
              name="addressType"
              id="newAddress"
              checked={selectedAddress === 'new'}
              onChange={() => setSelectedAddress('new')}
            />
            <label className="form-check-label fw-bold" htmlFor="newAddress">
              Sử dụng địa chỉ khác
            </label>
          </div>

          {/* Form nhập địa chỉ mới - chỉ hiện khi chọn "Sử dụng địa chỉ khác" */}
          {selectedAddress === 'new' && (
            <div className="border rounded p-4 bg-light">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label>Họ tên</label>
                  <input className="form-control" value={shipping.name} onChange={e => setShipping({...shipping, name: e.target.value})} required />
                </div>
                <div className="col-md-6 mb-3">
                  <label>Số điện thoại</label>
                  <input className="form-control" value={shipping.phone} onChange={e => setShipping({...shipping, phone: e.target.value})} required />
                </div>
              </div>
              <div className="mb-3">
                <label>Địa chỉ chi tiết</label>
                <textarea className="form-control" rows="3" value={shipping.addressLine} onChange={e => setShipping({...shipping, addressLine: e.target.value})} required />
              </div>
              {!isLoggedIn && (
                <div className="mb-3">
                  <label>Email (để nhận thông báo đơn hàng)</label>
                  <input type="email" className="form-control" value={shipping.email} onChange={e => setShipping({...shipping, email: e.target.value})} required />
                </div>
              )}
            </div>
          )}

          <div className="mt-4 d-flex justify-content-between">
            <button className="btn btn-secondary" onClick={() => navigate('/cart')}>Quay lại giỏ hàng</button>
            <button className="btn btn-primary" onClick={handleNextStep} disabled={!canProceedStep1()}>
              Tiếp theo
            </button>
          </div>
        </div>
      )}

      {/* === STEP 2: THANH TOÁN === */}
      {step === 2 && (
        <div>
          <h4>2. Phương thức thanh toán</h4>
          <div className="form-check mb-2">
            <input type="radio" className="form-check-input" id="cod" value="cod" checked={payment === 'cod'} onChange={e => setPayment(e.target.value)} />
            <label className="form-check-label" htmlFor="cod">Thanh toán khi nhận hàng (COD)</label>
          </div>
          <div className="form-check mb-4">
            <input type="radio" className="form-check-input" id="bank" value="bank" disabled onChange={e => setPayment(e.target.value)} />
            <label className="form-check-label text-muted" htmlFor="bank">Chuyển khoản ngân hàng (Đang bảo trì)</label>
          </div>
          <div className="d-flex justify-content-between">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Quay lại</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>Tiếp theo</button>
          </div>
        </div>
      )}

      {/* === STEP 3: XÁC NHẬN === */}
      {step === 3 && (
        <div>
          <h4>3. Xác nhận đơn hàng</h4>
          <div className="card mb-3">
            <div className="card-header bg-light fw-bold">Sản phẩm đã chọn</div>
            <ul className="list-group list-group-flush">
              {items.map((item, index) => (
                <li key={index} className="list-group-item d-flex align-items-center">
                  <img src={item.product.images?.[0] || '/placeholder.png'} alt={item.product.name} style={{ width: '50px', height: '50px', objectFit: 'cover', marginRight: '15px' }} />
                  <div className="flex-grow-1">
                    <h6 className="mb-0 text-truncate" style={{ maxWidth: '300px' }}>{item.product.name}</h6>
                    <small className="text-muted">Số lượng: {item.quantity}</small>
                  </div>
                  <span className="fw-bold">{(item.product.price * item.quantity).toLocaleString()}đ</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card mb-3">
             <div className="card-body">
                <h6 className="card-title fw-bold">Địa chỉ nhận hàng</h6>
                <p className="mb-1">
                    {isLoggedIn && selectedAddress !== 'new' 
                        ? profileAddresses.find(a => a._id === selectedAddress)?.fullName 
                        : shipping.name} 
                    {' | '}
                    {isLoggedIn && selectedAddress !== 'new' 
                        ? profileAddresses.find(a => a._id === selectedAddress)?.phone 
                        : shipping.phone}
                </p>
                <p className="mb-0 text-muted">
                    {isLoggedIn && selectedAddress !== 'new' 
                        ? profileAddresses.find(a => a._id === selectedAddress)?.addressLine 
                        : shipping.addressLine}
                </p>
             </div>
          </div>

          <div className="card p-3 bg-light">
            <div className="mb-3">
                <label className="form-label text-muted small">Mã giảm giá (Đã áp dụng):</label>
                <input className="form-control" value={coupon || 'Không có'} readOnly disabled />
            </div>
            
            {isLoggedIn && loyaltyPoints > 0 && (
                <div className="form-check mb-3">
                <input type="checkbox" className="form-check-input" id="usePoints" checked={usePoints} onChange={handleUsePointsChange} />
                <label className="form-check-label" htmlFor="usePoints">
                    Dùng {loyaltyPoints.toLocaleString()} điểm (tương đương {(loyaltyPoints * 1000).toLocaleString()}đ)
                </label>
                </div>
            )}

            <div className="d-flex justify-content-between mb-2"><span>Tạm tính:</span><span>{totals.subtotal.toLocaleString()} VND</span></div>
            {totals.discount > 0 && <div className="d-flex justify-content-between mb-2 text-success"><span>Giảm giá:</span><span>-{totals.discount.toLocaleString()} VND</span></div>}
            {usePoints && <div className="d-flex justify-content-between mb-2 text-success"><span>Giảm từ điểm:</span><span>-{(pointsToUse * 1000).toLocaleString()} VND</span></div>}
            <div className="d-flex justify-content-between mb-2"><span>Thuế VAT (10%):</span><span>{totals.tax.toLocaleString()} VND</span></div>
            <div className="d-flex justify-content-between mb-3"><span>Phí vận chuyển:</span><span>{totals.shipping.toLocaleString()} VND</span></div>
            <div className="d-flex justify-content-between border-top pt-3"><h5 className="fw-bold">Tổng cộng:</h5><h5 className="fw-bold text-primary">{finalTotal.toLocaleString()} VND</h5></div>
          </div>
          
          <div className="mt-4 d-flex justify-content-between">
            <button className="btn btn-secondary" onClick={() => setStep(2)}>Quay lại</button>
            <button className="btn btn-success btn-lg" onClick={placeOrder}>Xác nhận đặt hàng</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;