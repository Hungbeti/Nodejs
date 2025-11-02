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
    api.get('/products?sort=createdAtDesc&limit=5').then(res => setNewProducts(res.data.products));
    api.get('/products?sort=soldDesc&limit=5').then(res => setBestSellers(res.data.products));
    api.get('/products?category=laptop&limit=5').then(res => setLaptops(res.data.products));
    api.get('/products?category=monitor&limit=5').then(res => setMonitors(res.data.products));
    api.get('/products?category=harddrive&limit=5').then(res => setHardDrives(res.data.products));
  }, []);

  return (
    <div>
      <h2>Sản Phẩm Mới</h2>
      <div className="row">
        {newProducts.map(p => <div className="col-md-2 mb-3" key={p._id}><ProductCard product={p} /></div>)}
      </div>

      <h2>Bán Chạy Nhất</h2>
      <div className="row">
        {bestSellers.map(p => <div className="col-md-2 mb-3" key={p._id}><ProductCard product={p} /></div>)}
      </div>

      <h2>Laptop</h2>
      <div className="row">
        {laptops.map(p => <div className="col-md-2 mb-3" key={p._id}><ProductCard product={p} /></div>)}
      </div>

      <h2>Màn Hình</h2>
      <div className="row">
        {monitors.map(p => <div className="col-md-2 mb-3" key={p._id}><ProductCard product={p} /></div>)}
      </div>

      <h2>Ổ Cứng</h2>
      <div className="row">
        {hardDrives.map(p => <div className="col-md-2 mb-3" key={p._id}><ProductCard product={p} /></div>)}
      </div>
    </div>
    
    
  );
};

export default Home;