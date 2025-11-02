//src/pages/admin/AdminProducts.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';

const AdminProducts = () => {
  const navigate = useNavigate();

  /* ---------- STATE ---------- */
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [tab, setTab] = useState('products'); // products | categories | brands

  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingBrand, setEditingBrand] = useState(null);

  const initProduct = {
    name: '',
    price: '',
    images: '',
    description: '',
    stock: '',
    category: '',
    brand: '',
  };
  const initCategory = { name: '' };
  const initBrand = { name: '', category: '' };

  const [productForm, setProductForm] = useState(initProduct);
  const [categoryForm, setCategoryForm] = useState(initCategory);
  const [brandForm, setBrandForm] = useState(initBrand);

  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  const [categoryError, setCategoryError] = useState('');
  const [brandError, setBrandError] = useState('');

  /* ---------- FETCH ---------- */
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(searchParams); // Lấy tất cả query
      const { data } = await api.get(`/products?${params.toString()}`);
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data.categories || []);
    } catch {
      alert('Lỗi tải danh mục');
    }
  };

  const fetchBrands = async (categoryId = '') => {
    try {
      const { data } = await api.get(`/brands${categoryId ? `?category=${categoryId}` : ''}`);
      setBrands(data.brands || []);
    } catch {
      console.error('Lỗi tải thương hiệu');
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchBrands();
  }, [searchParams]);

  /* ---------- PRODUCT CRUD ---------- */
  const submitProduct = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, productForm);
      } else {
        await api.post('/products', productForm);
      }
      resetProduct();
      fetchProducts();
      alert('Thành công');
    } catch {
      alert('Lỗi khi lưu sản phẩm');
    }
  };

  const editProduct = (p) => {
    setProductForm({
      ...p,
      category: p.category?._id || '',  // ← LẤY CHUỖI ID
      brand: p.brand?._id || ''        // ← Cũng sửa cho brand
    });
    setEditingProduct(p);
    if (p.category?._id) {
      fetchBrands(p.category._id);  // ← Dùng _id
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Xóa sản phẩm?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch {
      alert('Lỗi khi xóa');
    }
  };

  const resetProduct = () => {
    setProductForm(initProduct);
    setEditingProduct(null);
  };

  /* ---------- CATEGORY CRUD ---------- */
  const submitCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, categoryForm);
      } else {
        await api.post('/categories', categoryForm);
      }
      resetCategory();
      fetchCategories();
      alert('Thành công');
    } catch (err) {
      setCategoryError(err.response?.data?.msg || 'Lỗi danh mục');
    }
  };

  const editCategory = (c) => {
    setCategoryForm(c);
    setEditingCategory(c);
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Xóa danh mục?')) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch {
      alert('Lỗi khi xóa danh mục');
    }
  };

  const resetCategory = () => {
    setCategoryForm(initCategory);
    setEditingCategory(null);
  };

  /* ---------- BRAND CRUD ---------- */
  const submitBrand = async (e) => {
    e.preventDefault();
    setBrandError('');
    try {
      if (editingBrand) {
        await api.put(`/brands/${editingBrand._id}`, brandForm);
      } else {
        await api.post('/brands', brandForm);
      }
      resetBrand();
      fetchBrands();
      alert('Thành công!');
    } catch (err) {
      setBrandError(err.response?.data?.msg || 'Lỗi thêm thương hiệu');
    }
  };

  const editBrand = (b) => {
    setBrandForm(b);
    setEditingBrand(b);
  };

  const deleteBrand = async (id) => {
    if (!window.confirm('Xóa thương hiệu?')) return;
    try {
      await api.delete(`/brands/${id}`);
      fetchBrands();
    } catch {
      alert('Lỗi khi xóa thương hiệu');
    }
  };

  const resetBrand = () => {
    setBrandForm(initBrand);
    setEditingBrand(null);
  };

  /* ---------- RENDER ---------- */
  return (
    <div className="container-fluid p-4">
      <h2 className="mb-4">Quản lý sản phẩm</h2>

      {/* Tabs */}
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

      {/* ==================== PRODUCTS ==================== */}
      {tab === 'products' && (
        <div className="row">
          {/* FORM */}
          <div className="col-lg-4">
            <div className="card p-3 mb-4">
              <h5>{editingProduct ? 'Cập nhật' : 'Thêm'} sản phẩm</h5>
              <form onSubmit={submitProduct}>
                {/* Danh mục */}
                <div className="mb-2">
                  <label className="form-label">Danh mục</label>
                  <select
                    className="form-select"
                    required
                    value={productForm.category}
                    onChange={async (e) => {
                      const categoryId = e.target.value;
                      setProductForm({ ...productForm, category: categoryId, brand: '' });
                      if (categoryId) {
                        const { data } = await api.get(`/brands?category=${categoryId}`);
                        setBrands(data.brands);
                      } else {
                        setBrands([]);
                      }
                    }}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Thương hiệu */}
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

                {/* Các trường khác */}
                <div className="mb-2">
                  <label className="form-label">Tên</label>
                  <input
                    className="form-control"
                    required
                    disabled={!productForm.category}
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label">Giá (VNĐ)</label>
                  <input
                    className="form-control"
                    type="number"
                    required
                    disabled={!productForm.category}
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label">Hình ảnh (URL, cách nhau bằng dấu phẩy)</label>
                  <input
                    className="form-control"
                    required
                    disabled={!productForm.category}
                    value={Array.isArray(productForm.images) ? productForm.images.join(', ') : productForm.images || ''}
                    onChange={(e) => setProductForm({ ...productForm, images: e.target.value.split(',').map((s) => s.trim()) })}
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label">Mô tả</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    required
                    disabled={!productForm.category}
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label">Tồn kho</label>
                  <input
                    className="form-control"
                    type="number"
                    required
                    disabled={!productForm.category}
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
            <div className="table-responsive">
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
                        <button className="btn btn-sm btn-warning me-1" onClick={() => editProduct(p)}>
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

      {/* ==================== CATEGORIES ==================== */}
      {tab === 'categories' && (
        <div className="row">
          {categoryError && <div className="alert alert-danger">{categoryError}</div>}
          <div className="col-lg-4">
            <div className="card p-3 mb-4">
              <h5>{editingCategory ? 'Cập nhật' : 'Thêm'} danh mục</h5>
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
              </form>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="table-responsive">
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
                        <button className="btn btn-sm btn-warning me-1" onClick={() => editCategory(c)}>
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

      {/* ==================== BRANDS ==================== */}
      {tab === 'brands' && (
        <div className="row">
          {brandError && <div className="alert alert-danger">{brandError}</div>}
          <div className="col-lg-4">
            <div className="card p-3 mb-4">
              <h5>{editingBrand ? 'Cập nhật' : 'Thêm'} thương hiệu</h5>
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
              </form>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="table-responsive">
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
                      <td>{b.category?.name || categories.find((c) => c._id === b.category)?.name || '-'}</td>
                      <td>
                        <button className="btn btn-sm btn-warning me-1" onClick={() => editBrand(b)}>
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
