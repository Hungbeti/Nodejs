// src/pages/Cart.js
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
// import socket from '../socket'; 
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Modal, Button, ListGroup, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';

// === LẤY CÁC HÀM TỪ CART CONTEXT ===
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
  // Thêm 'selectedItems' vào state cart (hoặc tách riêng)
  // Ở đây mình tách riêng để dễ quản lý
  const [cartItems, setCartItems] = useState([]); 
  const [selectedItems, setSelectedItems] = useState([]); // Mảng chứa product._id
  
  const [totals, setTotals] = useState({ subtotal: 0, discount: 0, tax: 0, shipping: 0, total: 0 });
  
  const [coupon, setCoupon] = useState('');
  const [error, setError] = useState('');
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  
  const { fetchCartCount } = useCart();
  const { isLoggedIn } = useAuth();
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

  const handleSelectCoupon = (code) => {
    setCoupon(code);
    setShowCouponModal(false);
  };

  // === TÍNH TOÁN TỔNG TIỀN (CHỈ CHO SẢN PHẨM ĐƯỢC CHỌN) ===
  const calculateTotals = (items, selectedIds, discount = 0) => {
    const validItems = (items || []).filter(item => item && item.product && typeof item.product.price === 'number');
    
    // Lọc ra các item được chọn
    const itemsToCalc = validItems.filter(item => selectedIds.includes(item.product._id));

    const subtotal = itemsToCalc.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    
    // Nếu subtotal = 0 (không chọn gì) thì các phí khác cũng = 0
    const tax = subtotal > 0 ? subtotal * 0.1 : 0; 
    const shipping = subtotal > 0 ? 30000 : 0;
    
    // Discount không được vượt quá tổng tiền (subtotal + tax + shipping)
    const maxDiscount = subtotal + tax + shipping;
    const finalDiscount = Math.min(discount, maxDiscount);
    
    const total = subtotal + tax + shipping - finalDiscount;
    
    return { subtotal, discount: finalDiscount, tax, shipping, total };
  };
  // ========================================================

  const loadCart = async () => {
    try {
      let items = [];
      if (isLoggedIn) {
        const res = await api.get('/cart');
        items = res.data.items || [];
        // Mặc định chọn tất cả khi mới tải (nếu muốn)
        // setSelectedItems(items.map(i => i.product._id)); 
      } else {
        items = getGuestCart();
      }
      setCartItems(items);
      // Tính toán lại dựa trên selectedItems hiện tại
      setTotals(calculateTotals(items, selectedItems, 0)); // Reset discount khi load lại
      fetchCartCount();
    } catch (err) {
      setCartItems([]);
      setTotals(calculateTotals([], [], 0));
    }
  };

  useEffect(() => {
    loadCart();
  }, [isLoggedIn]);

  // Khi selectedItems thay đổi, tính lại tiền
  useEffect(() => {
    setTotals(calculateTotals(cartItems, selectedItems, totals.discount));
  }, [selectedItems, cartItems]);


  // === XỬ LÝ CHECKBOX ===
  const handleSelectItem = (productId) => {
    if (selectedItems.includes(productId)) {
      setSelectedItems(selectedItems.filter(id => id !== productId));
    } else {
      setSelectedItems([...selectedItems, productId]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(cartItems.map(i => i.product._id));
    } else {
      setSelectedItems([]);
    }
  };
  // ======================

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
      loadCart();
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
      // Xóa khỏi danh sách đã chọn nếu đang chọn
      setSelectedItems(prev => prev.filter(id => id !== productId));
      loadCart();
    } catch (err) { toast.error('Lỗi xóa'); }
  };

  const applyCoupon = async () => {
    setError('');
    if (selectedItems.length === 0) {
      setError('Vui lòng chọn sản phẩm để áp dụng mã.');
      return;
    }

    try {
      // Chỉ gửi các item được chọn để check coupon
      const selectedCartItems = cartItems.filter(item => selectedItems.includes(item.product._id));

      const res = await api.post('/coupons/validate', { 
        code: coupon,
        orderTotal: totals.subtotal, // Subtotal của các item đã chọn
        cartItems: selectedCartItems      
      });

      if (res.data.valid) {
        const discountAmount = res.data.discountAmount;
        // Cập nhật state totals trực tiếp
        setTotals(prev => ({
           ...prev,
           discount: discountAmount,
           total: prev.subtotal + prev.tax + prev.shipping - discountAmount
        }));
        toast.success(res.data.msg);
      } else {
        setError(res.data.msg || 'Mã không hợp lệ');
      }
    } catch (err) {
      setTotals(prev => ({ ...prev, discount: 0, total: prev.subtotal + prev.tax + prev.shipping }));
      setError(err.response?.data?.msg || 'Mã không hợp lệ');
    }
  };
  
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

    try {
      const res = await api.post('/cart/check-stock', { items: itemsToCheck });
      if (res.data.success) {
        // Tiếp tục sang checkout
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
          {/* CHECKBOX CHỌN TẤT CẢ */}
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
                  {/* CHECKBOX TỪNG SẢN PHẨM */}
                  <input 
                    type="checkbox" 
                    className="me-3 form-check-input" 
                    checked={selectedItems.includes(item.product._id)}
                    onChange={() => handleSelectItem(item.product._id)}
                  />
                  {/* ... */}
                  <img src={item.product.images[0]} alt={item.product.name} style={{ width: '80px' }} className="me-3" />
                  <div className="flex-grow-1">
                    <h6>{item.product.name}</h6>
                    {/* <p className="text-muted">SKU: {item.product.sku || 'N/A'}</p> */}
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
            ))
          )}
        </div>
        
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
              <button className="btn btn-link p-0 text-decoration-none mb-3" onClick={fetchCoupons}>
                <i className="bi bi-tags-fill me-1"></i>Xem mã giảm giá có sẵn
              </button>

              {error && <p className="text-danger small">{error}</p>}
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex justify-content-between"><span>Tạm tính</span><span>{totals.subtotal.toLocaleString()}đ</span></li>
                <li className="list-group-item d-flex justify-content-between text-success"><span>Giảm giá</span><span>- {totals.discount.toLocaleString()}đ</span></li>
                <li className="list-group-item d-flex justify-content-between"><span>Thuế VAT</span><span>{totals.tax.toLocaleString()}đ</span></li>
                <li className="list-group-item d-flex justify-content-between"><span>Phí vận chuyển</span><span>{totals.shipping.toLocaleString()}đ</span></li>
                <li className="list-group-item d-flex justify-content-between fw-bold"><span>Thành tiền</span><span className="text-primary">{totals.total.toLocaleString()}đ</span></li>
              </ul>
              <button 
                onClick={handleCheckout} 
                className="btn btn-primary w-100 mt-3"
                disabled={selectedItems.length === 0} // Disable nếu không chọn gì
              >
                TIẾP TỤC ({selectedItems.length})
              </button>

            </div>
          </div>
        </div>
      </div>
      
      {/* MODAL DANH SÁCH MÃ GIẢM GIÁ (Giữ nguyên) */}
      <Modal show={showCouponModal} onHide={() => setShowCouponModal(false)}>
         {/* ... */}
        <Modal.Header closeButton><Modal.Title>Mã giảm giá</Modal.Title></Modal.Header>
        <Modal.Body>
          <ListGroup variant="flush">
            {availableCoupons
              .filter(cp => cp.uses < cp.maxUses)
              .map(cp => (
                <ListGroup.Item 
                  key={cp._id} 
                  action 
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
          </ListGroup>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Cart;