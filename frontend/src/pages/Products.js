// src/pages/Products.js
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';

// === HÀM HELPER MỚI: ĐỊNH DẠNG SỐ ===
const formatPriceInput = (value) => {
  // 1. Xóa mọi ký tự không phải số
  const numString = value.replace(/[^0-9]/g, '');
  if (!numString) return '';
  // 2. Định dạng lại
  return Number(numString).toLocaleString('vi-VN');
};

const parsePriceInput = (value) => {
  // Xóa dấu .
  return value.replace(/\./g, ''); 
};
// ===================================

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  // const [categories, setCategories] = useState([]); // Không cần state này nữa
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('');
  const [loading, setLoading] = useState(false);

  const getFilter = (key, defaultValue = '') => searchParams.get(key) || defaultValue;

  const filters = {
    category: getFilter('category'),
    brand: getFilter('brand'),
    minPrice: getFilter('minPrice'),
    maxPrice: getFilter('maxPrice'),
    search: getFilter('search'),
  };

  // State cho input giá (để hiển thị định dạng)
  const [priceInput, setPriceInput] = useState({
    min: formatPriceInput(filters.minPrice),
    max: formatPriceInput(filters.maxPrice)
  });

  const updateUrl = (newFilters) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    updateUrl({ ...filters, [name]: value });
  };

  // === SỬA LỖI ĐỊNH DẠNG GIÁ ===
  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    // Cập nhật giá trị hiển thị (có dấu .)
    setPriceInput(prev => ({ ...prev, [name]: formatPriceInput(value) }));
  };

  const handlePriceBlur = (e) => {
    // Khi người dùng bấm ra ngoài, cập nhật URL
    const { name } = e.target;
    const rawValue = parsePriceInput(priceInput[name]); // Lấy giá trị số
    
    // Chỉ cập nhật URL nếu giá trị thay đổi
    if (rawValue !== filters[name === 'min' ? 'minPrice' : 'maxPrice']) {
      updateUrl({ ...filters, [name === 'min' ? 'minPrice' : 'maxPrice']: rawValue });
    }
  };
  // ===============================
  
  const handleSortChange = (e) => {
    setSort(e.target.value);
    // Sửa: Phải gọi updateUrl để cập nhật 'sort'
    updateUrl({ ...filters, sort: e.target.value });
  };

  // Bỏ useEffect tải categories

  // TẢI THƯƠNG HIỆU THEO DANH MỤC
  useEffect(() => {
    const fetchBrands = async () => {
      if (!filters.category) {
        setBrands([]);
        return;
      }
      try {
        // Backend /brands chấp nhận TÊN danh mục
        const { data } = await api.get(`/brands?category=${filters.category}`);
        setBrands(data.brands || []);
      } catch (err) {
        console.error('Lỗi tải thương hiệu:', err);
        setBrands([]);
      }
    };
    fetchBrands();
  }, [filters.category]);

  // TẢI SẢN PHẨM
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      // Lấy query từ URL (searchParams)
      const query = new URLSearchParams(searchParams);
      // Thêm page và sort (vì chúng là state, không phải URL)
      query.set('page', page);
      if(sort) query.set('sort', sort);

      try {
        const { data } = await api.get(`/products?${query.toString()}`);
        setProducts(data.products || []);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        console.error('Lỗi tải sản phẩm:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    // Cập nhật lại state của input giá nếu URL thay đổi (ví dụ: bấm nút back)
    setPriceInput({
      min: formatPriceInput(filters.minPrice),
      max: formatPriceInput(filters.maxPrice)
    });
    setSort(getFilter('sort')); // Cập nhật state sort

  }, [page, searchParams]); // Bỏ 'sort', chỉ phụ thuộc vào 'page' và 'searchParams'

  // === SỬA LỖI TIÊU ĐỀ ===
  // Lấy tên danh mục trực tiếp từ URL (filters.category)
  const currentCategoryName = filters.category || 'Tất cả sản phẩm';
  // ======================

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
                // === SỬA LỖI LỌC THƯƠNG HIỆU ===
                // Gửi TÊN thương hiệu (b.name) thay vì ID (b._id)
                // để khớp với backend
                <option key={b._id} value={b.name}>{b.name}</option>
                // ==============================
              ))}
            </select>

            <h5 className="mb-3">Khoảng giá (VND)</h5>
            <div className="mb-2">
              <input
                className="form-control"
                name="min"
                placeholder="Từ"
                value={priceInput.min} // Dùng state hiển thị
                onChange={handlePriceChange} // Dùng hàm định dạng
                onBlur={handlePriceBlur} // Dùng hàm cập nhật URL
              />
            </div>
            <div className="mb-3">
              <input
                className="form-control"
                name="max"
                placeholder="Đến"
                value={priceInput.max} // Dùng state hiển thị
                onChange={handlePriceChange} // Dùng hàm định dạng
                onBlur={handlePriceBlur} // Dùng hàm cập nhật URL
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
              {totalPages > 1 && (
                <nav className="d-flex justify-content-center mt-5">
                  <ul className="pagination">
                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setPage(page - 1)}
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
                        <button className="page-link" onClick={() => setPage(i + 1)}>
                          {i + 1}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setPage(page + 1)}
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