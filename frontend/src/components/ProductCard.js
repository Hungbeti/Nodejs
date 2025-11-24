// src/components/ProductCard.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();

  const handleBuyClick = (e) => {
    e.preventDefault(); 
    e.stopPropagation();
    navigate(`/product/${product._id}`);
  };

  // --- HÀM TÍNH TOÁN HIỂN THỊ GIÁ ---
  const getPriceDisplay = () => {
    // Nếu không có biến thể hoặc mảng rỗng -> Dùng giá gốc
    if (!product.variants || product.variants.length === 0) {
      return Number(product.price).toLocaleString('vi-VN') + ' ₫';
    }

    // Lấy danh sách tất cả các giá từ biến thể
    const prices = product.variants.map(v => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Nếu giá min = max (tất cả biến thể đồng giá) -> Hiện 1 giá
    if (minPrice === maxPrice) {
      return Number(minPrice).toLocaleString('vi-VN') + ' ₫';
    }

    // Nếu giá khác nhau -> Hiện khoảng giá "Min - Max"
    return `${Number(minPrice).toLocaleString('vi-VN')} - ${Number(maxPrice).toLocaleString('vi-VN')} ₫`;
  };
  // -----------------------------------

  return (
    <Link to={`/product/${product._id}`} className="card shadow-sm h-100 text-decoration-none text-dark">
      <img 
        src={Array.isArray(product.images) ? product.images[0] : product.image || '/placeholder.png'} 
        className="card-img-top" 
        alt={product.name} 
        style={{ height: '180px', objectFit: 'cover' }} 
      />
      <div className="card-body d-flex flex-column">
        <h6 className="card-title text-truncate" title={product.name}>{product.name}</h6>
        
        {/* SỬA PHẦN HIỂN THỊ GIÁ Ở ĐÂY */}
        <p className="card-text text-danger fw-bold mb-3">
          {getPriceDisplay()}
        </p>
        
        <div className="mt-auto">
          <button 
            onClick={handleBuyClick} 
            className="btn btn-primary btn-sm w-100"
          >
            <i className="bi bi-cart-plus me-2"></i> Chọn mua
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;