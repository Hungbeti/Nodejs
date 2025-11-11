//src/components/ProductCard.js
import React from 'react';
import { Link } from 'react-router-dom'; // 1. Import Link
import { useCart } from '../context/CartContext';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();

  const handleAddToCart = async (e) => {
    e.stopPropagation(); // Ngăn click vào thẻ Link cha
    e.preventDefault(); // Ngăn hành vi mặc định
    try {
      await addToCart(product, 1);
      alert('Thêm vào giỏ thành công!');
    } catch (err) {
      alert('Không thể thêm vào giỏ: ' + (err.response?.data?.msg || err.message));
    }
  };

  return (
    // 2. Bọc toàn bộ thẻ bằng Link
    <Link to={`/product/${product._id}`} className="card shadow-sm h-100 text-decoration-none text-dark">
      <img 
        src={Array.isArray(product.images) ? product.images[0] : product.image || '/placeholder.png'} 
        className="card-img-top" 
        alt={product.name} 
        style={{ height: '180px', objectFit: 'cover' }} 
      />
      <div className="card-body d-flex flex-column">
        <h6 className="card-title text-truncate" title={product.name}>{product.name}</h6>
        <p className="card-text text-danger fw-bold mb-3">
          {Number(product.price).toLocaleString('vi-VN')} ₫
        </p>
        <div className="mt-auto d-flex justify-content-between">
          {/* 3. Thêm nút "Xem" và sửa nút "Thêm" */}
          <button onClick={handleAddToCart} className="btn btn-outline-primary btn-sm me-2">
            <i className="bi bi-cart-plus"></i> Thêm
          </button>
          <button className="btn btn-secondary btn-sm">
            Xem
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;