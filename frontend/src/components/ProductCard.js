//src/components/ProductCard.js
import React from 'react';
// KHÔNG cần 'api' nữa, import 'useCart'
import { useCart } from '../context/CartContext';

const ProductCard = ({ product }) => {
  // Lấy hàm addToCart "thông minh" từ Context
  const { addToCart } = useCart();

  const handleAddToCart = async () => {
    try {
      // Chỉ cần gọi hàm này, nó sẽ tự xử lý mọi thứ
      await addToCart(product, 1);
      alert('Thêm vào giỏ thành công!');
    } catch (err) {
      // Lỗi này sẽ bao gồm cả lỗi API (nếu đã đăng nhập)
      alert('Không thể thêm vào giỏ: ' + (err.response?.data?.msg || err.message));
    }
  };

  return (
    <div className="card shadow-sm h-100">
      <img 
        src={Array.isArray(product.images) ? product.images[0] : product.image || '/placeholder.png'} 
        className="card-img-top" 
        alt={product.name} 
        style={{ height: '180px', objectFit: 'cover' }} 
      />
      <div className="card-body d-flex flex-column">
        <h6 className="card-title text-truncate">{product.name}</h6>
        <p className="card-text text-danger fw-bold mb-3">
          {Number(product.price).toLocaleString('vi-VN')} ₫
        </p>
        <div className="mt-auto d-flex justify-content-between">
          {/* Nút "Thêm" bây giờ gọi hàm handleAddToCart */}
          <button onClick={handleAddToCart} className="btn btn-outline-primary btn-sm">
            <i className="bi bi-cart-plus"></i> Thêm
          </button>
          <button className="btn btn-success btn-sm">Mua ngay</button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;