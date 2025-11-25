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
  const parsedCart = cart ? JSON.parse(cart) : [];
  
  return parsedCart.map(item => {
    // Nếu item.product đã là object (lưu đúng từ ProductDetail), giữ nguyên
    // Nếu item.product là chuỗi ID (lưu kiểu cũ), cần fallback để không lỗi
    const productData = typeof item.product === 'object' ? item.product : {};

    return {
      ...item,
      _id: item._id || `${item.product._id || item.product}-${item.variantId}`, // Đảm bảo có _id cho key
      product: {
        _id: productData._id || item.product, // ID gốc
        name: productData.name || item.name || 'Sản phẩm', // Tên
        images: productData.images || item.images || [], // Ảnh
        price: productData.price || 0 // Giá gốc
      },
      // Các trường quan trọng cho biến thể
      variantName: item.variantName || '', 
      price: item.price || productData.price || 0 // Giá biến thể
    };
  });
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
  
  const { fetchCartCount, updateGuestItem, removeGuestItem } = useCart();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  // 1. SỬA LOGIC TÍNH TỔNG: Dùng item.price thay vì item.product.price
  const calculateBaseTotals = (items, selectedIds) => {
    // Lọc những item hợp lệ
    const validItems = (items || []).filter(item => item && item.product);
    
    // Lọc những item được chọn (so sánh theo item._id thay vì product._id)
    const itemsToCalc = validItems.filter(item => selectedIds.includes(item._id));
    
    // Tính tổng: Dùng item.price (giá biến thể)
    const subtotal = itemsToCalc.reduce((sum, item) => sum + ((item.price || item.product?.price || 0) * item.quantity), 0);
    
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

  // 2. SỬA LOGIC SELECT ALL: Lưu item._id
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(cartItems.map(i => i._id)); // Dùng _id của cart item
    } else {
      setSelectedItems([]);
    }
  };

  // 3. SỬA LOGIC SELECT ITEM: Lưu item._id
  const handleSelectItem = (itemId) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    } else {
      setSelectedItems([...selectedItems, itemId]);
    }
  };

  // 4. SỬA LOGIC UPDATE: Gửi itemId
  const updateQuantity = async (itemId, qty) => {
    if (qty < 1) return removeItem(itemId);

    try {
      if (isLoggedIn) {
        await api.put('/cart/update', { itemId, quantity: qty });
        loadCart();
        fetchCartCount();
      } else {
        // ==== GUEST LOGIC ====
        updateGuestItem(itemId, qty); // Gọi Context để update cả Storage và Badge
        loadCart();
      }
    } catch (err) {
      toast.error('Lỗi cập nhật');
    }
  };

  // 5. SỬA LOGIC REMOVE: Gửi itemId
  const removeItem = async (itemId) => {
    try {
      if (isLoggedIn) {
        await api.delete(`/cart/remove/${itemId}`);
        loadCart();
        fetchCartCount();
      } else {
        // ==== GUEST LOGIC ====
        removeGuestItem(itemId); // Gọi Context
        
        // Cập nhật UI trang Cart
        setSelectedItems(prev => prev.filter(id => id !== itemId));
        loadCart();
      }
    } catch (err) {
      toast.error('Lỗi xóa');
    }
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

  // Load danh sách coupon
  const fetchCoupons = async () => {
    try {
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
      // Lọc dựa trên item._id (ID dòng giỏ hàng) thay vì item.product._id
      .filter(item => selectedItems.includes(item._id)) 
      .map(item => {
        // Lấy ID sản phẩm gốc an toàn (loại bỏ phần biến thể nếu có)
        const rawId = item.product._id || item.product;
        const cleanProductId = rawId.toString().split('-')[0];

        return {
          product: cleanProductId, 
          quantity: item.quantity,
          variantId: item.variantId 
        };
      });
    // --------------------

    if (itemsToCheck.length === 0) return toast.error('Vui lòng chọn ít nhất 1 sản phẩm');

    try {
      const res = await api.post('/cart/check-stock', { items: itemsToCheck });
      if (res.data.success) {
        navigate('/checkout', { 
          state: { 
            // --- SỬA CẢ ĐOẠN NÀY NỮA ---
            // Lọc đúng danh sách selectedItems để truyền sang trang Checkout
            selectedItems: cartItems.filter(item => selectedItems.includes(item._id)),
            // ---------------------------
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
              <div key={item._id} className="card mb-3"> 
                <div className="card-body d-flex align-items-center">
                  <input 
                    type="checkbox" 
                    className="me-3 form-check-input" 
                    checked={selectedItems.includes(item._id)} // Check theo item._id
                    onChange={() => handleSelectItem(item._id)}
                  />
                  
                  <Link to={`/product/${(item.product._id || item.product).toString().split('-')[0]}`}>
                      <img src={item.product.images ? item.product.images[0] : (item.images ? item.images[0] : '')} alt={item.product.name} style={{ width: '80px', objectFit:'cover' }} className="me-3 rounded border" />
                  </Link>
                  
                  <div className="flex-grow-1">
                    <Link to={`/product/${(item.product._id || item.product).toString().split('-')[0]}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {/* Tên sản phẩm */}
                        <h6 className="mb-1 hover-primary fw-bold">
                            {item.product.name || item.name}
                        </h6>
                        
                        {/* --- PHẦN HIỂN THỊ PHIÊN BẢN (SỬA LẠI) --- */}
                        {/* Luôn hiển thị nếu có variantName */}
                        {item.variantName ? (
                           <div className="text-muted small mb-1">
                             Phân loại: <span className="badge bg-light text-dark border">{item.variantName}</span>
                           </div>
                        ) : (
                           // Fallback nếu không có variantName nhưng có variantId (dữ liệu cũ)
                           item.variantId && <div className="text-muted small">Phiên bản: {item.variantId}</div>
                        )}
                        {/* ------------------------------------------ */}
                    </Link>
                    
                    {/* Giá tiền */}
                    <p className="text-primary fw-bold m-0">
                      {(item.price || item.product.price || 0).toLocaleString()}đ
                    </p>
                  </div>

                  <div className="d-flex align-items-center me-3">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => updateQuantity(item._id, item.quantity - 1)}>-</button>
                    <span className="mx-2" style={{width: '20px', textAlign:'center'}}>{item.quantity}</span>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => updateQuantity(item._id, item.quantity + 1)}>+</button>
                  </div>
                  
                  {/* --- SỬA ĐOẠN TÍNH TỔNG NÀY --- */}
                  <h6 className="me-3">{((item.price || item.product.price) * item.quantity).toLocaleString()}đ</h6>
                  {/* ------------------------------ */}
                  
                  <button className="btn btn-sm btn-outline-danger" onClick={() => removeItem(item._id || item.product._id)}><i className="bi bi-trash"></i></button>
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
      
      {/* MODAL COUPON */}
      <Modal show={showCouponModal} onHide={() => setShowCouponModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Mã giảm giá có sẵn</Modal.Title></Modal.Header>
        <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <ListGroup variant="flush">
            {availableCoupons
              .filter(cp => cp.uses < cp.maxUses)
              .map(cp => (
                <ListGroup.Item 
                  key={cp._id} 
                  action 
                  onClick={() => handleSelectCoupon(cp.code)}
                  className="d-flex justify-content-between align-items-center border rounded mb-2"
                >
                  <div>
                    <strong className="text-primary">{cp.code}</strong>
                    <div className="text-danger fw-bold">
                       Giảm {cp.type === 'percent' ? `${cp.value}%` : `${cp.value.toLocaleString()}đ`}
                    </div>
                    
                    {/* --- PHẦN CHỈNH SỬA BẮT ĐẦU --- */}
                    <div className="text-muted small mt-1" style={{fontSize: '0.85rem'}}>
                      <div>Đơn tối thiểu: {cp.minOrderValue.toLocaleString()}đ</div>
                      
                      {/* Hiển thị danh mục áp dụng */}
                      <div>
                        Áp dụng: {cp.applicableCategories && cp.applicableCategories.length > 0 
                          ? cp.applicableCategories.map(c => c.name).join(', ') 
                          : 'Tất cả sản phẩm'}
                      </div>

                      {/* Hiển thị số lượt còn lại */}
                      <div className="text-success">
                        Còn lại: {cp.maxUses - cp.uses} lượt
                      </div>
                    </div>
                    {/* --- PHẦN CHỈNH SỬA KẾT THÚC --- */}

                  </div>
                  <Button variant="outline-success" size="sm" onClick={(e) => {
                      e.stopPropagation(); 
                      handleSelectCoupon(cp.code);
                  }}>Áp dụng</Button>
                </ListGroup.Item>
              ))
            }
             {availableCoupons.length === 0 && <p className="text-center text-muted">Không có mã nào phù hợp.</p>}
          </ListGroup>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Cart;