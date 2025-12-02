// src/pages/ProductDetail.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'], // Thêm cấu hình này để kết nối ổn định hơn
  reconnection: true,
});

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mainImage, setMainImage] = useState(0); 
  
  // STATE CHỌN BIẾN THỂ (MỚI)
  const [selectedVariant, setSelectedVariant] = useState(null);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [guestName, setGuestName] = useState('');
  
  const { addToCart, fetchCartCount } = useCart();
  const { isLoggedIn } = useAuth();

  const fetchProduct = async () => {
    try {
      const { data } = await api.get(`/products/${id}`);
      setProduct(data);
      setLoading(false);
    } catch (err) {
      console.error('Lỗi tải sản phẩm:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
    socket.emit('joinProductRoom', id);
    const handleNewReview = (newReview) => {
      setProduct((prevProduct) => {
        if (!prevProduct) return prevProduct;
        return { ...prevProduct, reviews: [...(prevProduct.reviews || []), newReview] };
      });
    };
    socket.on('newReview', handleNewReview);
    return () => { socket.off('newReview', handleNewReview); };
  }, [id]);

  const handleAddToCart = async () => {
    if (!selectedVariant) return toast.error('Vui lòng chọn phiên bản!');
    try {
      // Dữ liệu chuẩn để gửi lên Backend (User đã đăng nhập)
      const cartItemPayload = {
        productId: product._id, // Quan trọng: Phải khớp với req.body.productId ở backend
        quantity: 1,
        variantId: selectedVariant._id,
        variantName: selectedVariant.name,
        price: selectedVariant.price
      };

      // Dữ liệu để lưu LocalStorage (Guest) - Cần cấu trúc khác một chút để hiển thị ngay
      const guestItemPayload = {
        _id: product._id + '-' + selectedVariant._id, // ID giả lập cho Guest
        product: { // Guest cần object product đầy đủ để hiển thị ảnh/tên
            _id: product._id,
            name: product.name,
            images: product.images,
            price: product.price // Giá gốc
        },
        price: selectedVariant.price, // Giá biến thể
        variantId: selectedVariant._id,
        variantName: selectedVariant.name,
        quantity: 1
      };
      
      // Kiểm tra đăng nhập để gửi đúng payload
      if (isLoggedIn) {
          await api.post('/cart/add', cartItemPayload);
          // Sau khi thêm thành công, fetch lại giỏ hàng để cập nhật state
          fetchCartCount(); 
          toast.success('Thêm thành công!');
      } else {
          // Logic cho Guest (giữ nguyên logic cũ của bạn hoặc dùng addToCart context)
          await addToCart(guestItemPayload, 1);
          toast.success('Thêm thành công!');
      }

    } catch (err) {
      toast.error(err.response?.data?.msg || 'Lỗi thêm vào giỏ');
    }
  };

  // HÀM CHO NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP
  const submitLoggedInReview = async (e) => {
    e.preventDefault();
    if (!comment || !rating) return toast.warn('Vui lòng nhập đủ thông tin');
    
    try {
      await api.post(`/products/${id}/reviews`, { rating, comment });
      toast.success('Gửi đánh giá thành công!');
      // Không cần fetchProduct() vì Socket sẽ tự cập nhật
      setComment('');
      setRating(5);
    } catch (err) {
      toast.error('Lỗi gửi đánh giá');
    }
  };

  // HÀM MỚI CHO KHÁCH
  const submitGuestComment = async (e) => {
    e.preventDefault();
    if (!comment || !guestName) return toast.warn('Vui lòng nhập tên và bình luận');

    try {
      await api.post(`/products/${id}/comments`, { name: guestName, comment });
      toast.success('Gửi bình luận thành công!');
      setComment('');
      setGuestName('');
    } catch (err) {
      toast.error('Lỗi gửi bình luận');
    }
  };

  if (loading) return <div className="text-center mt-5">Đang tải...</div>;
  if (!product) return <div className="text-center mt-5">Không tìm thấy sản phẩm.</div>;
  
  // Lấy giá và stock để hiển thị dựa trên selection
  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock;
  let priceDisplay = '';
  if (selectedVariant) {
    priceDisplay = Number(selectedVariant.price).toLocaleString('vi-VN') + ' ₫';
  } else if (product.variants && product.variants.length > 0) {
    const prices = product.variants.map(v => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    if (minPrice === maxPrice) {
       priceDisplay = Number(minPrice).toLocaleString('vi-VN') + ' ₫';
    } else {
       priceDisplay = `${Number(minPrice).toLocaleString('vi-VN')} - ${Number(maxPrice).toLocaleString('vi-VN')} ₫`;
    }
  } else {
    priceDisplay = Number(product.price).toLocaleString('vi-VN') + ' ₫';
  }
  
  // Xử lý mô tả có 5 dòng
  const descriptionLines = (product.description || '').split('\n').slice(0, 5).join('\n');

  return (
    <div className="container my-5">
      {/* PHẦN TRÊN: ẢNH & THÔNG TIN MUA HÀNG */}
      <div className="row mb-5">
        <div className="col-md-5">
          <div className="border rounded p-2 mb-3">
            <img 
                src={product.images[mainImage]} 
                alt={product.name} 
                className="img-fluid"
                style={{ maxHeight: '400px', width: '100%', objectFit: 'contain' }}
            />
          </div>
          {product.images.length > 1 && (
            <div className="d-flex gap-2 overflow-auto pb-2">
              {product.images.map((img, index) => (
                <img key={index} src={img} className={`img-thumbnail cursor-pointer ${index === mainImage ? 'border-primary' : ''}`} style={{ width: '70px', height: '70px', objectFit: 'cover' }} onClick={() => setMainImage(index)} alt="thumb" />
              ))}
            </div>
          )}
        </div>

        <div className="col-md-7">
          <h2 className="fw-bold mb-3">{product.name}</h2>
          
          <div className="mb-3">
             <span className="badge bg-info text-dark me-2">{product.brand?.name || 'N/A'}</span>
             <span className="badge bg-secondary">{product.category?.name || 'N/A'}</span>
          </div>

          <h3 className="text-danger fw-bold mb-4 bg-light p-3 rounded">
             {priceDisplay}
          </h3>

          <div className="mb-4">
             <label className="fw-bold mb-2 d-block">Chọn phiên bản:</label>
             <div className="d-flex flex-wrap gap-2">
                {product.variants?.map((v, idx) => (
                    <button 
                        key={v._id || idx}
                        className={`btn ${selectedVariant?._id === v._id ? 'btn-primary' : 'btn-outline-secondary'} px-4 py-2`}
                        onClick={() => setSelectedVariant(v)}
                    >
                        {v.name}
                    </button>
                ))}
             </div>
          </div>

          <div className="d-flex align-items-center mb-4">
             <strong className="me-2">Tình trạng:</strong> 
             <span className={`fw-bold ${currentStock > 0 ? 'text-success' : 'text-danger'}`}>
                {selectedVariant 
                    ? (currentStock > 0 ? `Còn hàng (${currentStock})` : 'Hết hàng') 
                    : 'Vui lòng chọn phiên bản'}
             </span>
          </div>
          
          <button 
            className="btn btn-primary btn-lg px-5 py-3" 
            onClick={handleAddToCart}
            disabled={currentStock === 0 || !selectedVariant}
          >
            <i className="bi bi-cart-plus me-2"></i>
            {currentStock === 0 ? 'Hết hàng' : 'THÊM VÀO GIỎ HÀNG'}
          </button>
        </div>
      </div>

      {/* PHẦN DƯỚI: MÔ TẢ & ĐÁNH GIÁ (Chia cột) */}
      <div className="row">
        {/* Cột Trái: MÔ TẢ SẢN PHẨM */}
        <div className="col-lg-8 mb-4">
            <div className="card shadow-sm h-100">
                <div className="card-header bg-white fw-bold py-3">
                    MÔ TẢ SẢN PHẨM
                </div>
                <div className="card-body">
                    <pre style={{ 
                        whiteSpace: 'pre-wrap', 
                        fontFamily: 'inherit',
                        fontSize: '1rem',
                        lineHeight: '1.6',
                        color: '#333'
                    }}>
                        {product.description}
                    </pre>
                </div>
            </div>
        </div>

        {/* Cột Phải: ĐÁNH GIÁ & BÌNH LUẬN */}
        <div className="col-lg-4">
          <div className="card shadow-sm">
             <div className="card-header bg-white fw-bold py-3">
                ĐÁNH GIÁ ({product.reviews?.length || 0})
             </div>
             <div className="card-body">
                {/* Form Đánh giá */}
                <div className="mb-4 p-3 bg-light rounded">
                    <h6 className="fw-bold mb-3">Viết đánh giá của bạn</h6>
                    <form onSubmit={isLoggedIn ? submitLoggedInReview : submitGuestComment}>
                        {!isLoggedIn && (
                        <div className="mb-2">
                            <input 
                            className="form-control form-control-sm" 
                            placeholder="Tên của bạn..." 
                            value={guestName}
                            onChange={e => setGuestName(e.target.value)}
                            required
                            />
                        </div>
                        )}
                        
                        {isLoggedIn && (
                        <div className="mb-2">
                            <select className="form-select form-select-sm" value={rating} onChange={e => setRating(e.target.value)}>
                                <option value="5">5 ⭐ (Tuyệt vời)</option>
                                <option value="4">4 ⭐ (Tốt)</option>
                                <option value="3">3 ⭐ (Bình thường)</option>
                                <option value="2">2 ⭐ (Tệ)</option>
                                <option value="1">1 ⭐ (Rất tệ)</option>
                            </select>
                        </div>
                        )}

                        <div className="mb-2">
                        <textarea 
                            className="form-control form-control-sm" 
                            rows="3" 
                            placeholder="Nội dung..."
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            required
                        ></textarea>
                        </div>
                        <button type="submit" className="btn btn-primary btn-sm w-100">Gửi đánh giá</button>
                    </form>
                </div>

                {/* List Đánh giá */}
                <div className="reviews-list" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {product.reviews && product.reviews.length > 0 ? (
                    [...product.reviews].reverse().map((review, index) => (
                        <div key={index} className="border-bottom pb-3 mb-3">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <strong className="d-block">{review.name}</strong>
                                    {review.rating && <small className="text-warning">{'⭐'.repeat(review.rating)}</small>}
                                </div>
                                <small className="text-muted" style={{fontSize: '0.75rem'}}>
                                    {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                                </small>
                            </div>
                            <p className="mb-0 mt-1 text-secondary small">{review.comment}</p>
                        </div>
                    ))
                    ) : (
                    <p className="text-muted text-center small py-3">Chưa có đánh giá nào.</p>
                    )}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;