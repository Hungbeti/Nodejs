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
  
  const { addToCart } = useCart();
  const { isLoggedIn } = useAuth();

  const fetchProduct = async () => {
    try {
      const { data } = await api.get(`/products/${id}`);
      setProduct(data);
      // Mặc định chọn biến thể đầu tiên nếu còn hàng (Tuỳ chọn)
      // if(data.variants && data.variants.length > 0) setSelectedVariant(data.variants[0]);
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
      const productToAdd = {
        _id: product._id + '-' + selectedVariant._id, // Tạo ID duy nhất cho item (productId-variantId)
        product: product._id,
        name: product.name,
        images: product.images,
        price: selectedVariant.price,
        variantId: selectedVariant._id,
        variantName: selectedVariant.name,
        quantity: 1
      };
      
      await addToCart(productToAdd, 1);
      toast.success('Thêm thành công!');
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Lỗi thêm');
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
  
  // Xử lý mô tả có 5 dòng
  const descriptionLines = (product.description || '').split('\n').slice(0, 5).join('\n');

  return (
    <div className="container my-5">
      <div className="row">
        <div className="col-md-5">
          <img 
            src={product.images[mainImage]} 
            alt={product.name} 
            className="img-fluid rounded mb-3 border"
            style={{ maxHeight: '400px', width: '100%', objectFit: 'contain' }}
          />
          {product.images.length > 1 && (
            <div className="d-flex gap-2 overflow-auto pb-2">
              {product.images.map((img, index) => (
                <img key={index} src={img} className={`img-thumbnail cursor-pointer ${index === mainImage ? 'border-primary' : ''}`} style={{ width: '60px', height: '60px', objectFit: 'cover' }} onClick={() => setMainImage(index)} alt="thumb" />
              ))}
            </div>
          )}
        </div>

        <div className="col-md-7">
          <h2>{product.name}</h2>
          
          {/* HIỂN THỊ GIÁ THEO BIẾN THỂ */}
          <h3 className="text-danger fw-bold my-3">
             {selectedVariant ? Number(currentPrice).toLocaleString('vi-VN') : 'Từ ' + Number(currentPrice).toLocaleString('vi-VN')} ₫
          </h3>
          
          <p><strong>Thương hiệu:</strong> {product.brand?.name || 'N/A'}</p>
          <p><strong>Danh mục:</strong> {product.category?.name || 'N/A'}</p>

          {/* === CHỌN BIẾN THỂ (MỚI) === */}
          <div className="mb-4">
             <label className="fw-bold mb-2">Chọn phiên bản:</label>
             <div className="d-flex flex-wrap gap-2">
                {product.variants?.map((v, idx) => (
                    <button 
                        key={v._id || idx}
                        className={`btn ${selectedVariant?._id === v._id ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setSelectedVariant(v)}
                    >
                        {v.name}
                    </button>
                ))}
             </div>
          </div>

          <p><strong>Tình trạng:</strong> 
             <span className={`ms-2 ${currentStock > 0 ? 'text-success' : 'text-danger'}`}>
                {selectedVariant 
                    ? (currentStock > 0 ? `Còn hàng (${currentStock})` : 'Hết hàng') 
                    : 'Vui lòng chọn phiên bản để xem kho'}
             </span>
          </p>
          
          <button 
            className="btn btn-primary btn-lg mt-3" 
            onClick={handleAddToCart}
            disabled={currentStock === 0 || !selectedVariant}
          >
            <i className="bi bi-cart-plus me-2"></i>Thêm vào giỏ hàng
          </button>
          
          <hr className="my-4" />
          <h5>Mô tả sản phẩm</h5>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{product.description}</pre>
        </div>
      </div>

      {/* BÌNH LUẬN */}
      <div className="row mt-5">
        <div className="col-md-8">
          <h3>Đánh giá & Bình luận ({product.reviews?.length || 0})</h3>
          
          <div className="card my-4 bg-light">
            <div className="card-body">
              <form onSubmit={isLoggedIn ? submitLoggedInReview : submitGuestComment}>
                {!isLoggedIn && (
                  <div className="mb-3">
                    <input 
                      className="form-control" 
                      placeholder="Tên của bạn (Bắt buộc)" 
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      required
                    />
                  </div>
                )}
                
                {isLoggedIn && (
                  <div className="mb-3 d-flex align-items-center">
                     <span className="me-2">Đánh giá:</span>
                     <select className="form-select w-auto" value={rating} onChange={e => setRating(e.target.value)}>
                        <option value="5">5 ⭐ (Tuyệt vời)</option>
                        <option value="4">4 ⭐ (Tốt)</option>
                        <option value="3">3 ⭐ (Bình thường)</option>
                        <option value="2">2 ⭐ (Tệ)</option>
                        <option value="1">1 ⭐ (Rất tệ)</option>
                     </select>
                  </div>
                )}

                <div className="mb-3">
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    placeholder="Viết bình luận của bạn..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    required
                  ></textarea>
                </div>
                <button type="submit" className="btn btn-primary">Gửi</button>
              </form>
            </div>
          </div>
          
          {/* DANH SÁCH REVIEW */}
          <div className="reviews-list">
            {product.reviews && product.reviews.length > 0 ? (
              [...product.reviews].reverse().map((review, index) => ( // Đảo ngược để hiện mới nhất lên đầu
                <div key={index} className="card mb-3 border-0 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <h6 className="fw-bold mb-1">{review.name}</h6>
                      <small className="text-muted">
                        {new Date(review.createdAt).toLocaleDateString('vi-VN')} {new Date(review.createdAt).toLocaleTimeString('vi-VN')}
                      </small>
                    </div>
                    {review.rating && <div className="text-warning mb-2">{'⭐'.repeat(review.rating)}</div>}
                    <p className="mb-0 text-secondary">{review.comment}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted">Chưa có đánh giá nào.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;