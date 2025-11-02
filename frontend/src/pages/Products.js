// src/pages/Products.js
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';

const Products = () => {
  // DÙNG useSearchParams ĐỂ ĐỌC & CẬP NHẬT URL
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]); // DÙNG ĐỂ HIỂN THỊ TÊN DANH MỤC
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('');
  const [loading, setLoading] = useState(false);

  // ĐỌC FILTER TỪ URL
  const getFilter = (key, defaultValue = '') => searchParams.get(key) || defaultValue;

  const filters = {
    category: getFilter('category'),
    brand: getFilter('brand'),
    minPrice: getFilter('minPrice'),
    maxPrice: getFilter('maxPrice'),
    search: getFilter('search'),
  };

  // CẬP NHẬT URL KHI FILTER THAY ĐỔI
  const updateUrl = (newFilters) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    params.set('page', '1'); // Reset page
    setSearchParams(params);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    updateUrl({ ...filters, [name]: value });
  };

  const handleSortChange = (e) => {
    setSort(e.target.value);
    updateUrl({ ...filters, sort: e.target.value });
  };

  // TẢI DANH MỤC (để hiển thị tên)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await api.get('/categories');
        setCategories(data.categories || []);
      } catch (err) {
        console.error('Lỗi tải danh mục:', err);
      }
    };
    fetchCategories();
  }, []);

  // TẢI THƯƠNG HIỆU THEO DANH MỤC
  useEffect(() => {
    const fetchBrands = async () => {
      if (!filters.category) {
        setBrands([]);
        return;
      }
      try {
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
      const query = new URLSearchParams({
        page,
        sort,
        ...filters,
      }).toString();

      try {
        const { data } = await api.get(`/products?${query}`);
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
  }, [page, sort, searchParams]); // PHỤ THUỘC VÀO searchParams → LUÔN CẬP NHẬT KHI URL THAY ĐỔI

  // LẤY TÊN DANH MỤC
  const currentCategoryName = categories.find(c => c._id === filters.category)?.name || 'Tất cả sản phẩm';

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
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>

            <h5 className="mb-3">Khoảng giá (VND)</h5>
            <div className="mb-2">
              <input
                className="form-control"
                name="minPrice"
                placeholder="Từ"
                value={filters.minPrice}
                onChange={handleFilterChange}
              />
            </div>
            <div className="mb-3">
              <input
                className="form-control"
                name="maxPrice"
                placeholder="Đến"
                value={filters.maxPrice}
                onChange={handleFilterChange}
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
          <h3 className="mb-4 text-primary fw-bold">{currentCategoryName}</h3>

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