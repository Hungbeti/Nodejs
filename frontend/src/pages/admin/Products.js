//src/pages/admin/Products.js
import { Modal, Button, Form } from 'react-bootstrap';
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';

const formatPriceInput = (value) => {
  const numString = String(value).replace(/[^0-9]/g, '');
  if (!numString) return '';
  return Number(numString).toLocaleString('vi-VN');
};

const parsePriceInput = (value) => {
  return String(value).replace(/\./g, ''); 
};

const AdminProducts = () => {
  /* ---------- STATE ---------- */
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [tab, setTab] = useState('products');

  // State cho việc chỉnh sửa
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingBrand, setEditingBrand] = useState(null);

  // State ẩn/hiện form sản phẩm
  const [showProductModal, setShowProductModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState([]); 
  const [imageUrlInput, setImageUrlInput] = useState('');

  const initProduct = { name: '', price: 0, images: '', description: '', stock: 0, category: '', brand: '' };
  const initCategory = { name: '' };
  const initBrand = { name: '', category: '' };

  const [productForm, setProductForm] = useState(initProduct);
  const [formattedProduct, setFormattedProduct] = useState({ price: '', stock: '' });
  const [categoryForm, setCategoryForm] = useState(initCategory);
  const [brandForm, setBrandForm] = useState(initBrand);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState({ product: '', category: '', brand: '' });

  // State cho tìm kiếm & lọc
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
    } catch { toast.error('Lỗi tải danh mục'); }
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

  // Load ban đầu
  useEffect(() => {
    fetchCategoriesForForm();
    fetchProducts();
  }, []);

  // Load khi filter thay đổi
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

  const handleProductCategoryChange = async (categoryId) => {
    setProductForm({ ...productForm, category: categoryId, brand: '' });
    if (categoryId) {
      const { data } = await api.get(`/brands?category=${categoryId}`);
      setBrands(data.brands);
    } else {
      setBrands([]);
    }
  };

  // === HÀM XỬ LÝ GIÁ & TỒN KHO (ĐỊNH DẠNG) ===
  const handleProductPriceChange = (e) => {
    const { name, value } = e.target;
    const rawValue = parsePriceInput(value);
    setFormattedProduct({ ...formattedProduct, [name]: formatPriceInput(rawValue) });
    setProductForm({ ...productForm, [name]: Number(rawValue) || 0 });
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setImages([...images, imageUrlInput.trim()]);
      setImageUrlInput(''); // Reset ô nhập
    }
  };

  // === HÀM MỚI: XỬ LÝ UPLOAD ẢNH ===
  const uploadFileHandler = async (e) => {
    const files = e.target.files;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }
    setUploading(true);
    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      const { data } = await api.post('/upload', formData, config);
      
      const fullPaths = data.map(path => `http://localhost:5000${path}`);
      
      // Nối thêm vào danh sách ảnh hiện tại
      setImages(prev => [...prev, ...fullPaths]);
      setUploading(false);
      
      // Reset input file để có thể chọn lại cùng file nếu muốn
      e.target.value = null; 
    } catch (error) {
      console.error(error);
      setUploading(false);
      toast.error('Lỗi upload ảnh');
    }
  };
  
  const handleRemoveImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  /* ---------- PRODUCT CRUD ---------- */
  const submitProduct = async (e) => {
    e.preventDefault();
    setError({ ...error, product: '' });

    // Validate 3 ảnh
    if (images.length < 3) {
      setError({ ...error, product: 'Vui lòng thêm ít nhất 3 hình ảnh cho sản phẩm.' });
      return;
    }

    try {
      const payload = {
        ...productForm,
        images: images // Gửi mảng ảnh đã xử lý
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, payload);
        toast.success('Cập nhật sản phẩm thành công');
      } else {
        await api.post('/products', payload);
        toast.success('Thêm sản phẩm thành công');
      }
      resetProduct();
      fetchProducts();
    } catch (err) {
      setError({ ...error, product: err.response?.data?.msg || 'Lỗi lưu sản phẩm' });
    }
  };

  const editProduct = (p) => {
    if (p.category?._id) {
      api.get(`/brands?category=${p.category._id}`).then(res => {
        setBrands(res.data.brands || []);
      });
    }

    setProductForm({
      ...p,
      category: p.category?._id || '',
      brand: p.brand?._id || '',
    });
    
    // Hiển thị giá trị định dạng
    setFormattedProduct({
      price: formatPriceInput(p.price),
      stock: formatPriceInput(p.stock)
    });

    // Tải danh sách ảnh vào state
    setImages(Array.isArray(p.images) ? p.images : []);

    setEditingProduct(p);
    setShowProductModal(true);
  };

  const resetProduct = () => {
    setProductForm(initProduct);
    setFormattedProduct({ price: '', stock: '' });
    setImages([]);
    setImageUrlInput('');
    setEditingProduct(null);
    setError({ ...error, product: '' });
    setShowProductModal(false);
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Xóa sản phẩm?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Đã xóa sản phẩm');
      fetchProducts();
    } catch { toast.error('Lỗi khi xóa'); }
  };

  /* ---------- CATEGORY CRUD ---------- */
  const submitCategory = async (e) => {
    e.preventDefault();
    setError({ ...error, category: '' });
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, categoryForm);
        toast.success('Cập nhật danh mục thành công');
      } else {
        await api.post('/categories', categoryForm);
        toast.success('Thêm danh mục thành công');
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
      toast.success('Đã xóa danh mục');
      fetchCategories();
    } catch { toast.error('Lỗi khi xóa danh mục'); }
  };
  const resetCategory = () => { setCategoryForm(initCategory); setEditingCategory(null); setError({ ...error, category: '' }); };

  /* ---------- BRAND CRUD ---------- */
  const submitBrand = async (e) => {
    e.preventDefault();
    setError({ ...error, brand: '' });
    try {
      if (editingBrand) {
        await api.put(`/brands/${editingBrand._id}`, brandForm);
        toast.success('Cập nhật thương hiệu thành công');
      } else {
        await api.post('/brands', brandForm);
        toast.success('Thêm thương hiệu thành công');
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
      toast.success('Đã xóa thương hiệu');
      fetchBrands();
    } catch { toast.error('Lỗi khi xóa thương hiệu'); }
  };
  const resetBrand = () => { setBrandForm(initBrand); setEditingBrand(null); setError({ ...error, brand: '' }); };

  /* ---------- RENDER ---------- */
  return (
    <div className="container-fluid p-4">
      <h2 className="mb-4">Quản lý sản phẩm</h2>

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
          {/* Nút Thêm Sản Phẩm*/}
          <div className="col-12 mb-3 text-end">
            <button className="btn btn-success" onClick={() => { resetProduct(); setShowProductModal(true); }}>
              <i className="bi bi-plus-lg me-2"></i>Thêm sản phẩm mới
            </button>
          </div>

          {/* FORM SẢN PHẨM */}
          <Modal show={showProductModal} onHide={resetProduct} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>{editingProduct ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
               {error.product && <div className="alert alert-danger">{error.product}</div>}
               <Form onSubmit={submitProduct}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <Form.Label>Tên sản phẩm</Form.Label>
                      <Form.Control required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <Form.Label>Giá (VNĐ)</Form.Label>
                      {/* Input Giá đã định dạng */}
                      <Form.Control 
                        type="text" 
                        name="price"
                        required 
                        value={formattedProduct.price} 
                        onChange={handleProductPriceChange} 
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <Form.Label>Danh mục</Form.Label>
                      <Form.Select required value={productForm.category} onChange={(e) => handleProductCategoryChange(e.target.value)}>
                        <option value="">-- Chọn danh mục --</option>
                        {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </Form.Select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <Form.Label>Thương hiệu</Form.Label>
                      <Form.Select required value={productForm.brand} onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })} disabled={!productForm.category}>
                        <option value="">-- Chọn thương hiệu --</option>
                        {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                      </Form.Select>
                    </div>
                    
                    {/* === QUẢN LÝ HÌNH ẢNH (NÂNG CẤP) === */}
                    <div className="col-12 mb-3">
                      <Form.Label>Hình ảnh</Form.Label>
                      
                      {/* Input thêm URL */}
                      <div className="input-group mb-2">
                        <Form.Control 
                          placeholder="Nhập URL ảnh..." 
                          value={imageUrlInput} 
                          onChange={(e) => setImageUrlInput(e.target.value)} 
                        />
                        <Button variant="outline-secondary" onClick={handleAddImageUrl} disabled={!imageUrlInput.trim()}>
                          Thêm
                        </Button>
                      </div>

                      {/* Input Upload File */}
                      <Form.Control type="file" multiple onChange={uploadFileHandler} className="mb-2" />
                      {uploading && <div className="text-muted small mt-1">Đang tải ảnh...</div>}

                      {/* Danh sách ảnh (Preview + Nút Xóa) */}
                      <div className="d-flex flex-wrap gap-2 mt-2 p-2 border rounded bg-light" style={{ minHeight: '100px' }}>
                        {images.map((img, idx) => (
                          <div key={idx} className="position-relative" style={{ width: '80px', height: '80px' }}>
                            <img 
                              src={img} 
                              alt={`preview-${idx}`} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }} 
                            />
                            <button 
                              type="button"
                              className="btn btn-danger btn-sm position-absolute top-0 end-0 p-0 d-flex justify-content-center align-items-center"
                              style={{ width: '20px', height: '20px', borderRadius: '50%', transform: 'translate(30%, -30%)' }}
                              onClick={() => handleRemoveImage(idx)}
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        {images.length === 0 && <div className="text-muted m-auto">Chưa có ảnh nào</div>}
                      </div>
                      <Form.Text className={images.length < 3 ? "text-danger" : "text-success"}>
                        Đã chọn {images.length} ảnh (Tối thiểu 3).
                      </Form.Text>
                    </div>
                    {/* =================================== */}

                    <div className="col-12 mb-3">
                      <Form.Label>Mô tả</Form.Label>
                      <Form.Control as="textarea" rows={3} required value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
                    </div>
                    <div className="col-12 mb-3">
                      <Form.Label>Tồn kho</Form.Label>
                      {/* Input Tồn kho đã định dạng */}
                      <Form.Control 
                        type="text" 
                        name="stock"
                        required 
                        value={formattedProduct.stock} 
                        onChange={handleProductPriceChange} 
                      />
                    </div>
                  </div>
                  
                  <div className="d-flex justify-content-end gap-2">
                    <Button variant="secondary" onClick={resetProduct}>Hủy</Button>
                    <Button type="submit" variant="primary" disabled={uploading || images.length < 3}>
                      {editingProduct ? 'Lưu cập nhật' : 'Tạo sản phẩm'}
                    </Button>
                  </div>
               </Form>
            </Modal.Body>
          </Modal>

          {/* TABLE (Tự động mở rộng nếu ẩn form) */}
          <div className="col-12">
            <div className="d-flex gap-2 mb-3">
              <input type="text" className="form-control" placeholder="Tìm theo tên..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
              <select className="form-select" style={{ maxWidth: '200px' }} value={productCategoryFilter} onChange={e => setProductCategoryFilter(e.target.value)}>
                <option value="">Tất cả danh mục</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            
            <div className="table-responsive bg-white rounded shadow-sm">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>#</th><th>Hình</th><th>Tên</th><th>Giá</th><th>Tồn</th><th>Danh mục</th><th>Thương hiệu</th><th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={p._id}>
                      <td>{i + 1}</td>
                      <td><img src={Array.isArray(p.images) ? p.images[0] : p.image} alt="" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: '4px' }} /></td>
                      <td>{p.name}</td>
                      <td>{Number(p.price).toLocaleString()}</td>
                      <td><span className={`badge ${p.stock > 0 ? 'bg-success' : 'bg-danger'}`}>{p.stock}</span></td>
                      <td>{p.category?.name || '-'}</td>
                      <td>{p.brand?.name || '-'}</td>
                      <td>
                        <button className="btn btn-sm btn-warning me-2" onClick={() => editProduct(p)}><i className="bi bi-pencil"></i></button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteProduct(p._id)}><i className="bi bi-trash"></i></button>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && <tr><td colSpan="8" className="text-center py-4 text-muted">Không tìm thấy sản phẩm nào.</td></tr>}
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
                <div className="mb-3">
                  <label className="form-label">Tên danh mục</label>
                  <input
                    className="form-control"
                    required
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  />
                </div>
                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-primary">
                    {editingCategory ? 'Cập nhật' : 'Thêm'}
                  </button>
                  {editingCategory && (
                    <button type="button" className="btn btn-secondary" onClick={resetCategory}>
                      Hủy
                    </button>
                  )}
                </div>
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
                        <button className="btn btn-sm btn-warning me-2" onClick={() => editCategory(c)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteCategory(c._id)}>
                          <i className="bi bi-trash"></i>
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
                <div className="mb-3">
                  <label className="form-label">Tên thương hiệu</label>
                  <input
                    className="form-control"
                    required
                    value={brandForm.name}
                    onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                  />
                </div>
                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-primary">
                    {editingBrand ? 'Cập nhật' : 'Thêm'}
                  </button>
                   {editingBrand && (
                    <button type="button" className="btn btn-secondary" onClick={resetBrand}>
                      Hủy
                    </button>
                  )}
                </div>
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
                style={{ maxWidth: '200px' }}
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
                        <button className="btn btn-sm btn-warning me-2" onClick={() => editBrand(b)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteBrand(b._id)}>
                          <i className="bi bi-trash"></i>
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
