// src/pages/Products.js
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';

// === HÀM HELPER: ĐỊNH DẠNG SỐ ===
const formatPriceInput = (value) => {
  const numString = value.replace(/[^0-9]/g, '');
  if (!numString) return '';
  return Number(numString).toLocaleString('vi-VN');
};

const parsePriceInput = (value) => {
  return value.replace(/\./g, ''); 
};

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  
  const [page, setPage] = useState(1); 
  const [sort, setSort] = useState('');
  
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const getFilter = (key, defaultValue = '') => searchParams.get(key) || defaultValue;

  // Lấy filters từ URL mỗi lần render
  const filters = {
    category: getFilter('category'),
    brand: getFilter('brand'),
    minPrice: getFilter('minPrice'),
    maxPrice: getFilter('maxPrice'),
    search: getFilter('search'),
  };

  const [priceInput, setPriceInput] = useState({
    min: formatPriceInput(filters.minPrice),
    max: formatPriceInput(filters.maxPrice)
  });

  // Hàm helper để cập nhật URL, sẽ kích hoạt useEffect tải lại
  const updateUrl = (newFilters, resetPage = true) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    if (resetPage) {
      params.set('page', '1');
    }
    setSearchParams(params);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    updateUrl({ [name]: value });
  };

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    setPriceInput(prev => ({ ...prev, [name]: formatPriceInput(value) }));
  };

  const handlePriceBlur = (e) => {
    const { name } = e.target;
    const rawValue = parsePriceInput(priceInput[name]);
    
    if (rawValue !== filters[name === 'min' ? 'minPrice' : 'maxPrice']) {
      updateUrl({ [name === 'min' ? 'minPrice' : 'maxPrice']: rawValue });
    }
  };
  
  const handleSortChange = (e) => {
    setSort(e.target.value);
    updateUrl({ sort: e.target.value });
  };
  
  // === HÀM MỚI: XỬ LÝ CHUYỂN TRANG ===
  const handlePageChange = (newPage) => {
    setPage(newPage); // Cập nhật state để UI phản hồi
    updateUrl({ page: newPage }, false); // Cập nhật URL, không reset trang
  };

  // TẢI THƯƠNG HIỆU THEO DANH MỤC
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const endpoint = filters.category 
          ? `/brands?category=${filters.category}` 
          : '/brands';
        
        const { data } = await api.get(endpoint);
        setBrands(data.brands || []);
      } catch (err) {
        setBrands([]);
      }
    };
    fetchBrands();
  }, [filters.category]);

  // TẢI SẢN PHẨM (useEffect chính)
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      
      // Lấy page và sort từ URL, không phải từ state
      const currentPage = parseInt(getFilter('page', '1'));
      const currentSort = getFilter('sort');
      setPage(currentPage);
      setSort(currentSort);

      const query = new URLSearchParams(searchParams);
      // Đảm bảo 'page' luôn được set
      query.set('page', currentPage); 

      try {
        const { data } = await api.get(`/products?${query.toString()}`);
        setProducts(data.products || []);
        // Đảm bảo totalPages luôn là 1 (theo yêu cầu)
        setTotalPages(data.totalPages || 1); 
      } catch (err) {
        console.error('Lỗi tải sản phẩm:', err);
        setProducts([]);
        setTotalPages(1); // Set 1 ngay cả khi lỗi
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    
    // Cập nhật lại input giá nếu URL thay đổi
    setPriceInput({
      min: formatPriceInput(filters.minPrice),
      max: formatPriceInput(filters.maxPrice)
    });

  }, [searchParams]); // Chỉ phụ thuộc vào searchParams

  const currentCategoryName = filters.category || 'Tất cả sản phẩm';

  return (
    <div className="container my-4">
      <div className="row">
        {/* BỘ LỌC */}
        <div className="col-md-3">
          <div className="card p-3 sticky-top" style={{ top: '1rem' }}>
            <h5 className="mb-3">Thương hiệu</h5>
            <select
              className="form-select mb-3"
              name="brand"
              value={filters.brand}
              onChange={handleFilterChange}
            >
              <option value="">Tất cả</option>
              {brands.map(b => (
                <option key={b._id} value={b.name}>{b.name}</option>
              ))}
            </select>

            <h5 className="mb-3">Khoảng giá (VND)</h5>
            <div className="mb-2">
              <input
                className="form-control"
                name="min"
                placeholder="Từ"
                value={priceInput.min}
                onChange={handlePriceChange}
                onBlur={handlePriceBlur}
              />
            </div>
            <div className="mb-3">
              <input
                className="form-control"
                name="max"
                placeholder="Đến"
                value={priceInput.max}
                onChange={handlePriceChange}
                onBlur={handlePriceBlur}
              />
            </div>

            <h5 className="mb-3">Sắp xếp</h5>
            <select className="form-select" value={sort} onChange={handleSortChange}>
              <option value="">Mặc định</option>
              <option value="nameAsc">Tên A-Z</option>
              <option value="nameDesc">Tên Z-A</option>
              <option value="priceAsc">Giá thấp - cao</option>
              <option value="priceDesc">Giá cao - thấp</option>
            </select>
          </div>
        </div>

        {/* DANH SÁCH SẢN PHẨM */}
        <div className="col-md-9">
          <h3 className="mb-4 text-primary fw-bold text-capitalize">{currentCategoryName}</h3>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="row g-4">
                {products.map(p => (
                  <div className="col-6 col-md-4 col-lg-3" key={p._id}>
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>

              {/* PHÂN TRANG */}
              {/* === SỬA LỖI: HIỂN THỊ KHI >= 1 === */}
              {totalPages >= 1 && (
                <nav className="d-flex justify-content-center mt-5">
                  <ul className="pagination">
                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                      >
                        Trước
                      </button>
                    </li>
                    {[...Array(totalPages)].map((_, i) => (
                      <li
                        key={i}
                        className={`page-item ${i + 1 === page ? 'active' : ''}`}
                      >
                        <button className="page-link" onClick={() => handlePageChange(i + 1)}>
                          {i + 1}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                      >
                        Sau
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          ) : (
            <div className="text-center py-5">
              <i className="bi bi-inbox display-1 text-muted"></i>
              <p className="mt-3 text-muted">Không tìm thấy sản phẩm nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;