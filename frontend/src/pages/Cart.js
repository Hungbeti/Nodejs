// src/pages/Cart.js
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // [YC 1] Đã import Link
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Modal, Button, ListGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';

// === CÁC HÀM HELPER ===
const getGuestCart = () => {
  const cart = localStorage.getItem('guestCart');
  return cart ? JSON.parse(cart) : []; 
};
const saveGuestCart = (items) => {
  localStorage.setItem('guestCart', JSON.stringify(items));
};

const Cart = () => {
  const [cartItems, setCartItems] = useState([]); 
  const [selectedItems, setSelectedItems] = useState([]); 
  
  const [totals, setTotals] = useState({ subtotal: 0, discount: 0, tax: 0, shipping: 0, total: 0 });
  
  const [coupon, setCoupon] = useState(''); // Mã đang nhập hoặc đang dùng
  const [error, setError] = useState('');
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  
  const { fetchCartCount } = useCart();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  // === HÀM TÍNH TOÁN TỔNG CƠ BẢN (Không bao gồm discount) ===
  const calculateBaseTotals = (items, selectedIds) => {
    const validItems = (items || []).filter(item => item && item.product && typeof item.product.price === 'number');
    const itemsToCalc = validItems.filter(item => selectedIds.includes(item.product._id));
    const subtotal = itemsToCalc.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    
    const tax = subtotal > 0 ? subtotal * 0.1 : 0; 
    const shipping = subtotal > 0 ? 30000 : 0;
    
    return { subtotal, tax, shipping };
  };

  // === [YC 2 & 3] LOGIC VALIDATE COUPON CHUNG ===
  // Hàm này nhận tham số động để xử lý real-time chính xác
  const validateCouponAction = async (code, currentCartItems, currentSelectedIds) => {
    if (!code) return 0;

    // 1. Tính lại subtotal dựa trên dữ liệu mới nhất
    const { subtotal } = calculateBaseTotals(currentCartItems, currentSelectedIds);
    const selectedCartItems = currentCartItems.filter(item => currentSelectedIds.includes(item.product._id));

    if (selectedCartItems.length === 0) return 0;

    try {
      const res = await api.post('/coupons/validate', { 
        code: code,
        orderTotal: subtotal, 
        cartItems: selectedCartItems      
      });

      if (res.data.valid) {
        setError('');
        return res.data.discountAmount; // Trả về số tiền giảm giá
      } else {
        // Mã tồn tại nhưng không thỏa điều kiện (ví dụ: tổng tiền bị giảm xuống dưới mức tối thiểu)
        // setError(res.data.msg); // Có thể hiện hoặc không tùy UX
        return 0;
      }
    } catch (err) {
      // setError(err.response?.data?.msg || 'Mã không hợp lệ');
      return 0;
    }
  };

  // === TẢI GIỎ HÀNG ===
  const loadCart = async () => {
    try {
      let items = [];
      if (isLoggedIn) {
        const res = await api.get('/cart');
        items = res.data.items || [];
      } else {
        items = getGuestCart();
      }
      setCartItems(items);
      fetchCartCount();
    } catch (err) {
      setCartItems([]);
    }
  };

  useEffect(() => {
    loadCart();
  }, [isLoggedIn]);

  // === [YC 3] EFFECT XỬ LÝ REAL-TIME & TÍNH TỔNG ===
  // Chạy mỗi khi: Giỏ hàng đổi, Chọn item đổi, hoặc Mã coupon đổi
  useEffect(() => {
    const updateTotals = async () => {
      // 1. Tính toán cơ bản trước
      const base = calculateBaseTotals(cartItems, selectedItems);
      
      let discountAmount = 0;

      // 2. Nếu có mã giảm giá, kiểm tra lại ngay lập tức
      if (coupon && selectedItems.length > 0) {
        discountAmount = await validateCouponAction(coupon, cartItems, selectedItems);
      }

      // 3. Cập nhật state Totals cuối cùng
      const maxDiscount = base.subtotal + base.tax + base.shipping;
      const finalDiscount = Math.min(discountAmount, maxDiscount);

      setTotals({
        ...base,
        discount: finalDiscount,
        total: base.subtotal + base.tax + base.shipping - finalDiscount
      });
    };

    updateTotals();
  }, [cartItems, selectedItems, coupon]); // Dependency quan trọng để real-time


  // === CÁC HÀM XỬ LÝ SỰ KIỆN ===

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(cartItems.map(i => i.product._id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (productId) => {
    if (selectedItems.includes(productId)) {
      setSelectedItems(selectedItems.filter(id => id !== productId));
    } else {
      setSelectedItems([...selectedItems, productId]);
    }
  };

  const updateQuantity = async (productId, qty) => {
    if (qty < 1) return removeItem(productId);
    try {
      if (isLoggedIn) {
        await api.put('/cart/update', { productId: productId, quantity: qty });
      } else {
        const items = getGuestCart();
        const item = items.find(i => i.product._id === productId);
        if (item) item.quantity = qty;
        saveGuestCart(items);
      }
      loadCart(); // Load lại sẽ kích hoạt useEffect tính lại tiền
    } catch (err) { toast.error('Lỗi cập nhật'); }
  };

  const removeItem = async (productId) => {
    try {
      if (isLoggedIn) {
        await api.delete(`/cart/remove/${productId}`);
      } else {
        let items = getGuestCart();
        items = items.filter(i => i.product._id !== productId);
        saveGuestCart(items);
      }
      setSelectedItems(prev => prev.filter(id => id !== productId));
      loadCart();
    } catch (err) { toast.error('Lỗi xóa'); }
  };

  // Nút Áp dụng thủ công (bên cạnh input)
  const handleManualApply = async () => {
    if (!coupon) return setError('Vui lòng nhập mã');
    if (selectedItems.length === 0) return setError('Vui lòng chọn sản phẩm');

    const discount = await validateCouponAction(coupon, cartItems, selectedItems);
    if (discount > 0) {
        toast.success('Áp dụng mã thành công!');
    } else {
        setError('Mã không hợp lệ hoặc chưa đủ điều kiện');
        setTotals(prev => ({...prev, discount: 0, total: prev.subtotal + prev.tax + prev.shipping}));
    }
  };
<<<<<<< HEAD
  
  const handleCheckout = async () => {
    const itemsToCheck = cartItems
      .filter(item => selectedItems.includes(item.product._id))
      .map(item => ({
        product: item.product._id,  // Chỉ gửi _id và quantity
        quantity: item.quantity
      }));

    if (itemsToCheck.length === 0) {
      return toast.error('Vui lòng chọn ít nhất 1 sản phẩm');
    }
=======
>>>>>>> ca73fa2 (huy update l2)

  // Load danh sách coupon
  const fetchCoupons = async () => {
    try {
<<<<<<< HEAD
      const res = await api.post('/cart/check-stock', { items: itemsToCheck });
      if (res.data.success) {
        // Tiếp tục sang checkout
=======
      const { data } = await api.get('/coupons/available');
      setAvailableCoupons(data);
      setShowCouponModal(true);
    } catch (err) {
      console.error('Lỗi tải coupons:', err);
    }
  };

  // [YC 2] Xử lý chọn coupon từ Modal -> Áp dụng ngay
  const handleSelectCoupon = async (code) => {
    setCoupon(code); // Set code vào state
    setShowCouponModal(false); 
    
    // Gọi validate ngay lập tức để UX mượt mà (hiện thông báo ngay)
    const discount = await validateCouponAction(code, cartItems, selectedItems);
    if (discount > 0) {
        toast.success(`Đã áp dụng mã ${code}`);
    } else {
        toast.warning('Mã này chưa đủ điều kiện áp dụng cho giỏ hàng hiện tại');
    }
    // Lưu ý: useEffect ở trên cũng sẽ chạy do 'coupon' thay đổi, đảm bảo tính toán đúng
  };

  const handleCheckout = async () => {
    const itemsToCheck = cartItems
      .filter(item => selectedItems.includes(item.product._id))
      .map(item => ({
        product: item.product._id,
        quantity: item.quantity
      }));

    if (itemsToCheck.length === 0) return toast.error('Vui lòng chọn ít nhất 1 sản phẩm');

    try {
      const res = await api.post('/cart/check-stock', { items: itemsToCheck });
      if (res.data.success) {
>>>>>>> ca73fa2 (huy update l2)
        navigate('/checkout', { 
          state: { 
            selectedItems: cartItems.filter(item => selectedItems.includes(item.product._id)),
            couponCode: coupon,
            discount: totals.discount 
          } 
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Lỗi kiểm tra hàng tồn kho');
    }
  };

  return (
    <div className="container my-4">
      <h2>Giỏ hàng ({cartItems.reduce((sum, item) => sum + item.quantity, 0)})</h2>
      <div className="row">
        <div className="col-md-8">
          {cartItems.length > 0 && (
            <div className="form-check mb-3 ps-4">
              <input 
                className="form-check-input" 
                type="checkbox" 
                id="selectAll"
                checked={selectedItems.length === cartItems.length && cartItems.length > 0}
                onChange={handleSelectAll}
              />
              <label className="form-check-label fw-bold" htmlFor="selectAll">
                Chọn tất cả ({cartItems.length} sản phẩm)
              </label>
            </div>
          )}

          {cartItems.length === 0 ? (
            <div className="text-center p-5">
              <p>Giỏ hàng của bạn đang trống.</p>
              <Link to="/" className="btn btn-primary">Tiếp tục mua sắm</Link>
            </div>
          ) : (
            cartItems.map(item => (
              <div key={item.product._id} className="card mb-3"> 
                <div className="card-body d-flex align-items-center">
                  <input 
                    type="checkbox" 
                    className="me-3 form-check-input" 
                    checked={selectedItems.includes(item.product._id)}
                    onChange={() => handleSelectItem(item.product._id)}
                  />
                  
                  {/* [YC 1] LINK ĐẾN TRANG CHI TIẾT SẢN PHẨM */}
                  <Link to={`/product/${item.product._id}`}>
                      <img src={item.product.images[0]} alt={item.product.name} style={{ width: '80px', objectFit:'cover' }} className="me-3 rounded border" />
                  </Link>
                  
                  <div className="flex-grow-1">
                    {/* [YC 1] LINK ĐẾN TRANG CHI TIẾT SẢN PHẨM (TÊN) */}
                    <Link to={`/product/${item.product._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h6 className="mb-1 hover-primary">{item.product.name}</h6>
                    </Link>
                    <p className="text-primary fw-bold">{item.product.price.toLocaleString()}đ</p>
                  </div>

                  <div className="d-flex align-items-center me-3">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => updateQuantity(item.product._id, item.quantity - 1)}>-</button>
                    <span className="mx-2" style={{width: '20px', textAlign:'center'}}>{item.quantity}</span>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => updateQuantity(item.product._id, item.quantity + 1)}>+</button>
                  </div>
                  <h6 className="me-3 mb-0">{(item.product.price * item.quantity).toLocaleString()}đ</h6>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => removeItem(item.product._id)}><i className="bi bi-trash"></i></button>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-bold">Thanh toán</div>
            <div className="card-body">

              <div className="input-group mb-2">
                <input 
                  className="form-control" 
                  placeholder="Mã giảm giá" 
                  value={coupon} 
                  onChange={e => setCoupon(e.target.value.toUpperCase())} 
                />
                <button className="btn btn-outline-primary" onClick={handleManualApply}>Áp dụng</button>
              </div>
              <button className="btn btn-link p-0 text-decoration-none mb-3" onClick={fetchCoupons}>
                <i className="bi bi-tags-fill me-1"></i>Xem mã giảm giá có sẵn
              </button>

              {error && <p className="text-danger small">{error}</p>}
              
              <ul className="list-group list-group-flush mb-3">
                <li className="list-group-item d-flex justify-content-between px-0"><span>Tạm tính</span><span>{totals.subtotal.toLocaleString()}đ</span></li>
                <li className="list-group-item d-flex justify-content-between px-0 text-success">
                    <span>Giảm giá {totals.discount > 0 && <i className="bi bi-check-circle-fill ms-1"></i>}</span>
                    <span>- {totals.discount.toLocaleString()}đ</span>
                </li>
                <li className="list-group-item d-flex justify-content-between px-0"><span>Thuế VAT (10%)</span><span>{totals.tax.toLocaleString()}đ</span></li>
                <li className="list-group-item d-flex justify-content-between px-0"><span>Phí vận chuyển</span><span>{totals.shipping.toLocaleString()}đ</span></li>
                <li className="list-group-item d-flex justify-content-between px-0 fw-bold border-top pt-2">
                    <span>Thành tiền</span>
                    <span className="text-primary fs-5">{totals.total.toLocaleString()}đ</span>
                </li>
              </ul>
              
              <button 
                onClick={handleCheckout} 
                className="btn btn-primary w-100 py-2"
                disabled={selectedItems.length === 0} 
              >
                MUA HÀNG ({selectedItems.length})
              </button>

            </div>
          </div>
        </div>
      </div>
      
<<<<<<< HEAD
      {/* MODAL DANH SÁCH MÃ GIẢM GIÁ (Giữ nguyên) */}
      <Modal show={showCouponModal} onHide={() => setShowCouponModal(false)}>
         {/* ... */}
        <Modal.Header closeButton><Modal.Title>Mã giảm giá</Modal.Title></Modal.Header>
        <Modal.Body>
=======
      {/* MODAL COUPON */}
      <Modal show={showCouponModal} onHide={() => setShowCouponModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Mã giảm giá</Modal.Title></Modal.Header>
        <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
>>>>>>> ca73fa2 (huy update l2)
          <ListGroup variant="flush">
            {availableCoupons
              .filter(cp => cp.uses < cp.maxUses)
              .map(cp => (
                <ListGroup.Item 
                  key={cp._id} 
                  action 
<<<<<<< HEAD
                  onClick={() => handleSelectCoupon(cp.code)}
                  className="d-flex justify-content-between align-items-start"
                >
                  <div>
                    <strong>{cp.code}</strong> - 
                    <span className="text-danger ms-1">
                      Giảm {cp.type === 'percent' ? `${cp.value}%` : `${cp.value.toLocaleString()}đ`}
                    </span>

                    <div className="text-muted small mt-2">
                      <div>
                        <strong>Đơn tối thiểu:</strong> {cp.minOrderValue.toLocaleString()}đ
                      </div>
                      <div>
                        <strong>Số lần dùng còn lại:</strong> {cp.maxUses - cp.uses}/{cp.maxUses}
                      </div>
                      
                      {/* Chỉ hiển thị "Áp dụng cho" nếu có danh mục cụ thể */}
                      {cp.applicableCategories && cp.applicableCategories.length > 0 && (
                        <div>
                          <strong>Áp dụng cho:</strong>{' '}
                          {Array.isArray(cp.applicableCategories)
                            ? cp.applicableCategories
                                .map(cat => (typeof cat === 'object' ? cat.name : cat))
                                .filter(Boolean)
                                .join(', ') || 'Không xác định'
                            : 'Tất cả'}
                        </div>
                      )}
                      
                      {/* Không hiển thị HSD nếu không có expiryDate hoặc là null/undefined */}
                      {cp.expiryDate && (
                        <div>
                          <strong>Hết hạn:</strong>{' '}
                          {new Date(cp.expiryDate).toLocaleDateString('vi-VN')}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button 
                    variant="outline-success" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation(); // Ngăn click toàn item
                      handleSelectCoupon(cp.code);
                    }}
                  >
                    Áp dụng
                  </Button>
                </ListGroup.Item>
              ))
            }
            
            {availableCoupons.filter(cp => cp.uses < cp.maxUses).length === 0 && (
              <div className="text-center text-muted py-4">
                Không có mã giảm giá nào khả dụng lúc này
              </div>
            )}
=======
                  // [YC 2] Click vào item cũng áp dụng luôn cho tiện
                  onClick={() => handleSelectCoupon(cp.code)}
                  className="d-flex justify-content-between align-items-center border rounded mb-2"
                >
                  <div>
                    <strong className="text-primary">{cp.code}</strong>
                    <div className="text-danger fw-bold">
                       Giảm {cp.type === 'percent' ? `${cp.value}%` : `${cp.value.toLocaleString()}đ`}
                    </div>
                    <div className="text-muted small" style={{fontSize: '0.85rem'}}>
                      Đơn tối thiểu: {cp.minOrderValue.toLocaleString()}đ <br/>
                      HSD: {cp.expiryDate ? new Date(cp.expiryDate).toLocaleDateString('vi-VN') : 'Vô thời hạn'}
                    </div>
                  </div>
                  <Button variant="outline-success" size="sm" onClick={(e) => {
                      e.stopPropagation(); 
                      handleSelectCoupon(cp.code);
                  }}>Áp dụng</Button>
                </ListGroup.Item>
              ))
            }
             {availableCoupons.length === 0 && <p className="text-center text-muted">Không có mã nào.</p>}
>>>>>>> ca73fa2 (huy update l2)
          </ListGroup>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Cart;