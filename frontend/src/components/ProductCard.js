//src/components/ProductCard.js
import React from 'react';
import api from '../services/api';

const ProductCard = ({ product }) => {
  const addToCart = () => {
    api.post('/cart/add', { productId: product._id, quantity: 1 })
      .then(() => alert('Thêm vào giỏ thành công!'))
      .catch(() => alert('Không thể thêm vào giỏ'));
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
          <button onClick={addToCart} className="btn btn-outline-primary btn-sm">
            <i className="bi bi-cart-plus"></i> Thêm
          </button>
          <button className="btn btn-success btn-sm">Mua ngay</button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
