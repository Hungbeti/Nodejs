// src/pages/ProductDetail.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext'; // Cần để check đăng nhập khi review

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mainImage, setMainImage] = useState(0); // Index của ảnh chính
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  
  const { addToCart } = useCart();
  const { isLoggedIn } = useAuth();

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/products/${id}`);
      setProduct(data);
    } catch (err) {
      console.error('Lỗi tải sản phẩm:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    try {
      await addToCart(product, 1);
      alert('Thêm vào giỏ thành công!');
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.msg || err.message));
    }
  };
  
  const submitReview = async (e) => {
    e.preventDefault();
    if (!comment || !rating) {
      return alert('Vui lòng nhập đủ đánh giá và bình luận');
    }
    try {
      await api.post(`/products/${id}/reviews`, { rating, comment });
      alert('Gửi đánh giá thành công!');
      fetchProduct(); // Tải lại sản phẩm để xem review mới
      setComment('');
      setRating(5);
    } catch (err) {
      alert('Lỗi gửi đánh giá: ' + (err.response?.data?.msg || 'Lỗi server'));
    }
  };

  if (loading) return <div>Đang tải...</div>;
  if (!product) return <div>Không tìm thấy sản phẩm.</div>;
  
  // Xử lý mô tả có 5 dòng
  const descriptionLines = (product.description || '').split('\n').slice(0, 5).join('\n');

  return (
    <div className="container my-5">
      <div className="row">
        {/* CỘT HÌNH ẢNH */}
        <div className="col-md-5">
          <img 
            src={product.images[mainImage]} 
            alt={product.name} 
            className="img-fluid rounded mb-3"
            style={{ maxHeight: '450px', width: '100%', objectFit: 'contain' }}
          />
          {/* Yêu cầu tối thiểu 3 ảnh */}
          {product.images.length >= 3 && (
            <div className="d-flex justify-content-start">
              {product.images.map((img, index) => (
                <img 
                  key={index}
                  src={img} 
                  alt={`thumbnail ${index}`}
                  className={`img-thumbnail me-2 cursor-pointer ${index === mainImage ? 'border-primary' : ''}`}
                  style={{ width: '80px', height: '80px', objectFit: 'cover', cursor: 'pointer' }}
                  onClick={() => setMainImage(index)}
                />
              ))}
            </div>
          )}
        </div>

        {/* CỘT THÔNG TIN */}
        <div className="col-md-7">
          <h2>{product.name}</h2>
          <h3 className="text-danger fw-bold my-3">{Number(product.price).toLocaleString('vi-VN')} ₫</h3>
          <p>
            <span className="text-muted me-3">Thương hiệu:</span> 
            <span className="fw-bold">{product.brand?.name || 'N/A'}</span>
          </p>
          <p>
            <span className="text-muted me-3">Danh mục:</span> 
            <span className="fw-bold">{product.category?.name || 'N/A'}</span>
          </p>
          <p>
            <span className="text-muted me-3">Tình trạng:</span> 
            <span className={`fw-bold ${product.stock > 0 ? 'text-success' : 'text-danger'}`}>
              {product.stock > 0 ? `Còn hàng (${product.stock})` : 'Hết hàng'}
            </span>
          </p>
          
          {/* PHIÊN BẢN (Biến thể) - Giả lập */}
          <div className="my-4">
            <h6 className="text-muted">Lưu ý về Biến thể:</h6>
            <p className="small">
              Yêu cầu của dự án là sản phẩm có 2 biến thể với tồn kho độc lập.
              Tuy nhiên, Model `Product` hiện tại không hỗ trợ cấu trúc này (đây là "flat product").
              Việc nâng cấp lên sản phẩm có biến thể sẽ yêu cầu thiết kế lại toàn bộ CSDL và logic.
              Sản phẩm này hiện được xem là 1 biến thể duy nhất.
            </p>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-primary active">Biến thể 1 (Hiện tại)</button>
              <button className="btn btn-outline-secondary" disabled>Biến thể 2 (Chưa hỗ trợ)</button>
            </div>
          </div>
          
          <button 
            className="btn btn-primary btn-lg" 
            onClick={handleAddToCart}
            disabled={product.stock === 0}
          >
            Thêm vào giỏ hàng
          </button>
          
          <hr className="my-4" />
          
          <h4>Mô tả sản phẩm</h4>
          {/* Yêu cầu 5 dòng */}
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '1rem' }}>
            {descriptionLines}
          </pre>
        </div>
      </div>

      {/* ĐÁNH GIÁ VÀ BÌNH LUẬN */}
      <div className="row mt-5">
        <div className="col-md-8">
          <h3>Đánh giá & Bình luận</h3>
          {/* Form gửi đánh giá */}
          {isLoggedIn ? (
            <div className="card my-4">
              <div className="card-body">
                <form onSubmit={submitReview}>
                  <div className="mb-3">
                    <label className="form-label">Đánh giá của bạn (sao)</label>
                    <select className="form-select" value={rating} onChange={e => setRating(e.target.value)}>
                      <option value="5">5 sao (Tuyệt vời)</option>
                      <option value="4">4 sao (Tốt)</option>
                      <option value="3">3 sao (Bình thường)</option>
                      <option value="2">2 sao (Tệ)</option>
                      <option value="1">1 sao (Rất tệ)</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Bình luận của bạn</label>
                    <textarea 
                      className="form-control" 
                      rows="3" 
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Viết bình luận của bạn..."
                      required
                    ></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary">Gửi đánh giá</button>
                </form>
              </div>
            </div>
          ) : (
            <div className="alert alert-info">Vui lòng đăng nhập để gửi đánh giá bằng sao.</div>
          )}
          
          {/* Danh sách các review đã có */}
          {product.reviews.length > 0 ? (
            product.reviews.map(review => (
              <div key={review._id} className="card card-body mb-3">
                <strong>{review.name}</strong>
                <div>{[...Array(review.rating)].map((_, i) => '⭐')}</div>
                <p className="mt-2 mb-0">{review.comment}</p>
                <small className="text-muted mt-2">{new Date(review.createdAt).toLocaleString()}</small>
              </div>
            ))
          ) : (
            <p className="text-muted">Chưa có đánh giá nào cho sản phẩm này.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;