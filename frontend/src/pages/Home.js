// src/pages/Home.js
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';

const Home = () => {
  const [newProducts, setNewProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [laptops, setLaptops] = useState([]);
  const [monitors, setMonitors] = useState([]);
  const [hardDrives, setHardDrives] = useState([]);

  useEffect(() => {
    // Sửa: sort=newest (theo backend)
    api.get('/products?sort=newest&limit=5').then(res => setNewProducts(res.data.products || []));
    // Sửa: sort=soldDesc (theo backend)
    api.get('/products?sort=soldDesc&limit=5').then(res => setBestSellers(res.data.products || []));
    
    // Sửa: Dùng tên category chuẩn (giả sử là "Laptop", "Màn Hình")
    api.get('/products?category=Laptop&limit=5').then(res => setLaptops(res.data.products || []));
    api.get('/products?category=Màn Hình&limit=5').then(res => setMonitors(res.data.products || []));
    api.get('/products?category=Ổ cứng&limit=5').then(res => setHardDrives(res.data.products || []));
  }, []);

  const renderSection = (title, products) => (
    <div className="mb-5">
      <h2 className="mb-3">{title}</h2>
      {products.length > 0 ? (
        <div className="row row-cols-2 row-cols-md-4 row-cols-lg-5 g-3">
          {products.map(p => (
            <div className="col" key={p._id}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted">Đang tải...</p>
      )}
    </div>
  );

  return (
    <div className="container my-4">
      {renderSection('Sản Phẩm Mới', newProducts)}
      {renderSection('Bán Chạy Nhất', bestSellers)}
      {renderSection('Laptop', laptops)}
      {renderSection('Màn Hình', monitors)}
      {renderSection('Ổ Cứng', hardDrives)}
    </div>
  );
};

export default Home;