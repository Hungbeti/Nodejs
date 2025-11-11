//src/pages/admin/Products.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AdminProducts = () => {
  /* ---------- STATE ---------- */
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [tab, setTab] = useState('products'); // products | categories | brands

  // State cho việc chỉnh sửa
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingBrand, setEditingBrand] = useState(null);

  const initProduct = { name: '', price: '', images: '', description: '', stock: '', category: '', brand: '' };
  const initCategory = { name: '' };
  const initBrand = { name: '', category: '' };

  const [productForm, setProductForm] = useState(initProduct);
  const [categoryForm, setCategoryForm] = useState(initCategory);
  const [brandForm, setBrandForm] = useState(initBrand);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState({ product: '', category: '', brand: '' });

  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [brandCategoryFilter, setBrandCategoryFilter] = useState('');
  
  const [productPage, setProductPage] = useState(1);
  const [productTotalPages, setProductTotalPages] = useState(1);

  /* ---------- FETCH ---------- */

  const buildParams = (paramsObj) => {
    const params = new URLSearchParams();
    for (const key in paramsObj) {
      if (paramsObj[key]) {
        params.append(key, paramsObj[key]);
      }
    }
    return params.toString();
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = buildParams({
        search: productSearch,
        category: productCategoryFilter,
        page: productPage
      });
      const { data } = await api.get(`/products?${params}`);
      setProducts(data.products || []);
      setProductTotalPages(data.totalPages || 1);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const params = buildParams({ search: categorySearch });
      const { data } = await api.get(`/categories?${params}`);
      setCategories(data.categories || []);
    } catch { alert('Lỗi tải danh mục'); }
  };

  const fetchBrands = async () => {
    try {
      const params = buildParams({
        search: brandSearch,
        category: brandCategoryFilter
      });
      const { data } = await api.get(`/brands?${params}`);
      setBrands(data.brands || []);
    } catch { console.error('Lỗi tải thương hiệu'); }
  };
  
  const fetchCategoriesForForm = () => {
     api.get('/categories').then(res => setCategories(res.data.categories || []));
  };
  
  // Tải Categories (1 lần) để dùng cho các bộ lọc
  useEffect(() => {
    //fetchCategories(); // Tải cho bộ lọc
    api.get('/categories').then(res => setCategories(res.data.categories || []));
  }, []); // Chỉ chạy 1 lần lúc đầu

  // Tải lại danh sách khi các bộ lọc/tìm kiếm/tab thay đổi
  useEffect(() => {
    if (tab === 'products') fetchProducts();
  }, [tab, productSearch, productCategoryFilter, productPage]);

  useEffect(() => {
    fetchCategoriesForForm();
  }, []);

  useEffect(() => {
    if (tab === 'products') fetchProducts();
  }, [tab, productSearch, productCategoryFilter, productPage]);

  useEffect(() => {
    if (tab === 'categories') fetchCategories();
  }, [tab, categorySearch]);
  
  useEffect(() => {
    if (tab === 'brands') fetchBrands();
  }, [tab, brandSearch, brandCategoryFilter]);
  
  useEffect(() => {
    if (tab === 'products' || tab === 'brands') {
      fetchCategoriesForForm();
    }
  }, [tab]);

  // Tải thương hiệu khi người dùng CHỦ ĐỘNG đổi danh mục trong form
  const handleProductCategoryChange = async (categoryId) => {
    setProductForm({ ...productForm, category: categoryId, brand: '' });
    if (categoryId) {
      const { data } = await api.get(`/brands?category=${categoryId}`);
      setBrands(data.brands);
    } else {
      setBrands([]);
    }
  };

  /* ---------- PRODUCT CRUD ---------- */
  const submitProduct = async (e) => {
    e.preventDefault();
    setError({ ...error, product: '' });
    try {
      const payload = {
        ...productForm,
        images: Array.isArray(productForm.images) ? productForm.images : productForm.images.split(',').map(s => s.trim())
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      resetProduct();
      fetchProducts();
    } catch (err) {
      setError({ ...error, product: err.response?.data?.msg || 'Lỗi lưu sản phẩm' });
    }
  };

  // === HÀM SỬA SẢN PHẨM (ĐÃ SỬA LỖI) ===
  const editProduct = (p) => {
    // 1. Tải danh sách thương hiệu đúng cho danh mục của sản phẩm này
    // mà không reset form
    if (p.category?._id) {
      api.get(`/brands?category=${p.category._id}`).then(res => {
        setBrands(res.data.brands || []);
      });
    }

    // 2. Đặt state cho form
    setProductForm({
      ...p,
      category: p.category?._id || '',
      brand: p.brand?._id || '',
      images: Array.isArray(p.images) ? p.images.join(', ') : p.images // Chuyển mảng thành chuỗi
    });
    
    // 3. Đặt state đang chỉnh sửa
    setEditingProduct(p);
  };
  // ===================================

  const deleteProduct = async (id) => {
    if (!window.confirm('Xóa sản phẩm?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch { alert('Lỗi khi xóa'); }
  };

  const resetProduct = () => {
    setProductForm(initProduct);
    setEditingProduct(null);
    setError({ ...error, product: '' });
  };

  /* ---------- CATEGORY CRUD ---------- */
  const submitCategory = async (e) => {
    e.preventDefault();
    setError({ ...error, category: '' });
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, categoryForm);
      } else {
        await api.post('/categories', categoryForm);
      }
      resetCategory();
      fetchCategories();
    } catch (err) {
      setError({ ...error, category: err.response?.data?.msg || 'Lỗi danh mục' });
    }
  };
  const editCategory = (c) => { setEditingCategory(c); setCategoryForm(c); };
  const deleteCategory = async (id) => {
    if (!window.confirm('Xóa danh mục?')) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch { alert('Lỗi khi xóa danh mục'); }
  };
  const resetCategory = () => { setCategoryForm(initCategory); setEditingCategory(null); setError({ ...error, category: '' }); };

  /* ---------- BRAND CRUD ---------- */
  const submitBrand = async (e) => {
    e.preventDefault();
    setError({ ...error, brand: '' });
    try {
      if (editingBrand) {
        await api.put(`/brands/${editingBrand._id}`, brandForm);
      } else {
        await api.post('/brands', brandForm);
      }
      resetBrand();
      fetchBrands();
    } catch (err) {
      setError({ ...error, brand: err.response?.data?.msg || 'Lỗi thêm thương hiệu' });
    }
  };
  const editBrand = (b) => {
    setEditingBrand(b);
    setBrandForm({ ...b, category: b.category?._id || '' });
  };
  const deleteBrand = async (id) => {
    if (!window.confirm('Xóa thương hiệu?')) return;
    try {
      await api.delete(`/brands/${id}`);
      fetchBrands();
    } catch { alert('Lỗi khi xóa thương hiệu'); }
  };
  const resetBrand = () => { setBrandForm(initBrand); setEditingBrand(null); setError({ ...error, brand: '' }); };

  /* ---------- RENDER ---------- */
  return (
    <div className="container-fluid p-4">
      <h2 className="mb-4">Quản lý sản phẩm</h2>

      {/* === CÁC TAB ĐIỀU HƯỚNG === */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>
            Sản phẩm
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'categories' ? 'active' : ''}`} onClick={() => setTab('categories')}>
            Danh mục
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'brands' ? 'active' : ''}`} onClick={() => setTab('brands')}>
            Thương hiệu
          </button>
        </li>
      </ul>

      {/* ==================== TAB SẢN PHẨM ==================== */}
      {tab === 'products' && (
        <div className="row">
          {/* FORM */}
          <div className="col-lg-4">
            <div className="card p-3 mb-4 shadow-sm">
              <h5>{editingProduct ? 'Cập nhật' : 'Thêm'} sản phẩm</h5>
              {error.product && <div className="alert alert-danger">{error.product}</div>}
              <form onSubmit={submitProduct}>
                <div className="mb-2">
                  <label className="form-label">Danh mục</label>
                  <select
                    className="form-select"
                    required
                    value={productForm.category}
                    onChange={(e) => handleProductCategoryChange(e.target.value)}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label">Thương hiệu</label>
                  <select
                    className="form-select"
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    disabled={!productForm.category}
                    required
                  >
                    <option value="">-- Chọn thương hiệu --</option>
                    {brands.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label">Tên</label>
                  <input
                    className="form-control"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Giá (VNĐ)</label>
                  <input
                    className="form-control" type="number" required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Hình ảnh (URL, cách nhau bằng dấu phẩy)</label>
                  <input
                    className="form-control" required
                    value={productForm.images}
                    onChange={(e) => setProductForm({ ...productForm, images: e.target.value })}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Mô tả</label>
                  <textarea
                    className="form-control" rows={3} required
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Tồn kho</label>
                  <input
                    className="form-control" type="number" required
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  {editingProduct ? 'Cập nhật' : 'Thêm'}
                </button>
                {editingProduct && (
                  <button type="button" className="btn btn-secondary w-100 mt-2" onClick={resetProduct}>
                    Hủy
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* TABLE */}
          <div className="col-lg-8">
            <div className="d-flex gap-2 mb-3">
              <input 
                type="text" 
                className="form-control" 
                placeholder="Tìm theo tên sản phẩm..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
              <select 
                className="form-select"
                value={productCategoryFilter}
                onChange={e => setProductCategoryFilter(e.target.value)}
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="table-responsive bg-white rounded shadow-sm">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Hình</th>
                    <th>Tên</th>
                    <th>Giá</th>
                    <th>Tồn</th>
                    <th>Danh mục</th>
                    <th>Thương hiệu</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={p._id}>
                      <td>{i + 1}</td>
                      <td>
                        <img src={Array.isArray(p.images) ? p.images[0] : p.image} alt="" style={{ width: 50, height: 50, objectFit: 'cover' }} />
                      </td>
                      <td>{p.name}</td>
                      <td>{Number(p.price).toLocaleString()}</td>
                      <td>{p.stock}</td>
                      <td>{p.category?.name || '-'}</td>
                      <td>{p.brand?.name || '-'}</td>
                      <td>
                        {/* === SỬA NÚT BẤM (me-2) === */}
                        <button className="btn btn-sm btn-warning me-2" onClick={() => editProduct(p)}>
                          Sửa
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteProduct(p._id)}>
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB DANH MỤC ==================== */}
      {tab === 'categories' && (
        <div className="row">
          <div className="col-lg-4">
            <div className="card p-3 mb-4 shadow-sm">
              <h5>{editingCategory ? 'Cập nhật' : 'Thêm'} danh mục</h5>
              {error.category && <div className="alert alert-danger">{error.category}</div>}
              <form onSubmit={submitCategory}>
                <div className="mb-2">
                  <label className="form-label">Tên danh mục</label>
                  <input
                    className="form-control"
                    required
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  {editingCategory ? 'Cập nhật' : 'Thêm'}
                </button>
                {editingCategory && (
                  <button type="button" className="btn btn-secondary w-100 mt-2" onClick={resetCategory}>
                    Hủy
                  </button>
                )}
              </form>
            </div>
          </div>

          <div className="col-lg-8">
            <input 
              type="text" 
              className="form-control mb-3" 
              placeholder="Tìm theo tên danh mục..."
              value={categorySearch}
              onChange={e => setCategorySearch(e.target.value)}
            />
            <div className="table-responsive bg-white rounded shadow-sm">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Tên</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c, i) => (
                    <tr key={c._id}>
                      <td>{i + 1}</td>
                      <td>{c.name}</td>
                      <td>
                        {/* === SỬA NÚT BẤM (me-2) === */}
                        <button className="btn btn-sm btn-warning me-2" onClick={() => editCategory(c)}>
                          Sửa
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteCategory(c._id)}>
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB THƯƠNG HIỆU ==================== */}
      {tab === 'brands' && (
        <div className="row">
          <div className="col-lg-4">
            <div className="card p-3 mb-4 shadow-sm">
              <h5>{editingBrand ? 'Cập nhật' : 'Thêm'} thương hiệu</h5>
              {error.brand && <div className="alert alert-danger">{error.brand}</div>}
              <form onSubmit={submitBrand}>
                <div className="mb-2">
                  <label className="form-label">Danh mục</label>
                  <select
                    className="form-select"
                    required
                    value={brandForm.category}
                    onChange={(e) => setBrandForm({ ...brandForm, category: e.target.value })}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label">Tên thương hiệu</label>
                  <input
                    className="form-control"
                    required
                    value={brandForm.name}
                    onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-primary w-100">
                  {editingBrand ? 'Cập nhật' : 'Thêm'}
                </button>
                 {editingBrand && (
                  <button type="button" className="btn btn-secondary w-100 mt-2" onClick={resetBrand}>
                    Hủy
                  </button>
                )}
              </form>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="d-flex gap-2 mb-3">
              <input 
                type="text" 
                className="form-control" 
                placeholder="Tìm theo tên thương hiệu..."
                value={brandSearch}
                onChange={e => setBrandSearch(e.target.value)}
              />
              <select 
                className="form-select"
                value={brandCategoryFilter}
                onChange={e => setBrandCategoryFilter(e.target.value)}
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="table-responsive bg-white rounded shadow-sm">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Tên</th>
                    <th>Danh mục</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((b, i) => (
                    <tr key={b._id}>
                      <td>{i + 1}</td>
                      <td>{b.name}</td>
                      <td>{b.category?.name || '-'}</td>
                      <td>
                        {/* === SỬA NÚT BẤM (me-2) === */}
                        <button className="btn btn-sm btn-warning me-2" onClick={() => editBrand(b)}>
                          Sửa
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteBrand(b._id)}>
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;