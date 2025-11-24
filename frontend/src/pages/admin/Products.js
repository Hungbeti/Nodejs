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

  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingBrand, setEditingBrand] = useState(null);

  const [showProductModal, setShowProductModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState([]); 
  const [imageUrlInput, setImageUrlInput] = useState('');

  // === STATE CHO BIẾN THỂ (MỚI) ===
  const [variants, setVariants] = useState([
    { name: '', price: '', stock: '' },
    { name: '', price: '', stock: '' }
  ]);

  const initProduct = { name: '', images: '', description: '', category: '', brand: '' };
  const initCategory = { name: '' };
  const initBrand = { name: '', category: '' };

  const [productForm, setProductForm] = useState(initProduct);
  const [categoryForm, setCategoryForm] = useState(initCategory);
  const [brandForm, setBrandForm] = useState(initBrand);

  const [error, setError] = useState({ product: '', category: '', brand: '' });
  
  // Các state filter/search giữ nguyên
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [brandCategoryFilter, setBrandCategoryFilter] = useState('');

  /* ---------- FETCH DATA ---------- */
  const fetchProducts = async () => {
    try {
      let url = `/products?page=1&limit=100`; // Lấy nhiều để demo
      if (productSearch) url += `&search=${productSearch}`;
      if (productCategoryFilter) url += `&category=${productCategoryFilter}`;
      const { data } = await api.get(url);
      setProducts(data.products || []);
    } catch (err) { console.error(err); } 
  };
  const fetchCategories = async () => { /* ... giữ nguyên code fetch ... */ 
      const { data } = await api.get('/categories');
      setCategories(data.categories || []);
  };
  const fetchBrands = async () => { /* ... giữ nguyên code fetch ... */ 
      const { data } = await api.get('/brands');
      setBrands(data.brands || []);
  };
  
  useEffect(() => { fetchCategories(); fetchProducts(); }, []);
  useEffect(() => { if (tab === 'products') fetchProducts(); }, [tab, productSearch, productCategoryFilter]);
  useEffect(() => { if (tab === 'categories') fetchCategories(); }, [tab, categorySearch]);
  useEffect(() => { if (tab === 'brands') fetchBrands(); }, [tab, brandSearch, brandCategoryFilter]);

  /* ---------- LOGIC BIẾN THỂ (MỚI) ---------- */
  const handleVariantChange = (index, field, value) => {
    const newVariants = [...variants];
    if (field === 'price' || field === 'stock') {
       newVariants[index][field] = value.replace(/[^0-9]/g, '');
    } else {
       newVariants[index][field] = value;
    }
    setVariants(newVariants);
  };

  const addVariant = () => {
    setVariants([...variants, { name: '', price: '', stock: '' }]);
  };

  const removeVariant = (index) => {
    if (variants.length <= 2) return toast.warning('Phải có ít nhất 2 biến thể');
    const newVariants = [...variants];
    newVariants.splice(index, 1);
    setVariants(newVariants);
  };

  /* ---------- XỬ LÝ ẢNH ---------- */
  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setImages([...images, imageUrlInput.trim()]);
      setImageUrlInput('');
    }
  };
  const uploadFileHandler = async (e) => {
    const files = e.target.files;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) { formData.append('images', files[i]); }
    setUploading(true);
    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      const { data } = await api.post('/upload', formData, config);
      const fullPaths = data.map(path => `http://localhost:5000${path}`);
      setImages(prev => [...prev, ...fullPaths]);
      setUploading(false);
      e.target.value = null; 
    } catch (error) { setUploading(false); toast.error('Lỗi upload ảnh'); }
  };
  const handleRemoveImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  /* ---------- SUBMIT PRODUCT ---------- */
  const submitProduct = async (e) => {
    e.preventDefault();
    setError({ ...error, product: '' });
    if (images.length < 3) return setError({ ...error, product: 'Vui lòng thêm ít nhất 3 hình ảnh.' });
    if (variants.length < 2) return setError({ ...error, product: 'Vui lòng thêm ít nhất 2 biến thể.' });

    try {
      const payload = {
        ...productForm,
        images: images,
        variants: variants.map(v => ({
           name: v.name,
           price: Number(v.price),
           stock: Number(v.stock)
        }))
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
      api.get(`/brands?category=${p.category._id}`).then(res => setBrands(res.data.brands || []));
    }
    setProductForm({
      name: p.name,
      description: p.description,
      category: p.category?._id || '',
      brand: p.brand?._id || '',
    });
    setImages(Array.isArray(p.images) ? p.images : []);
    
    // Load variants cũ lên
    if (p.variants && p.variants.length > 0) {
        setVariants(p.variants.map(v => ({
            name: v.name,
            price: String(v.price),
            stock: String(v.stock)
        })));
    } else {
        setVariants([{ name: '', price: '', stock: '' }, { name: '', price: '', stock: '' }]);
    }

    setEditingProduct(p);
    setShowProductModal(true);
  };

  const resetProduct = () => {
    setProductForm(initProduct);
    setVariants([{ name: '', price: '', stock: '' }, { name: '', price: '', stock: '' }]);
    setImages([]);
    setImageUrlInput('');
    setEditingProduct(null);
    setError({ ...error, product: '' });
    setShowProductModal(false);
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Xóa sản phẩm?')) return;
    try { await api.delete(`/products/${id}`); toast.success('Đã xóa'); fetchProducts(); } catch { toast.error('Lỗi xóa'); }
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
          <div className="col-12 mb-3 text-end">
            <button className="btn btn-success" onClick={() => { resetProduct(); setShowProductModal(true); }}>+ Thêm sản phẩm mới</button>
          </div>

          <Modal show={showProductModal} onHide={resetProduct} size="lg">
            <Modal.Header closeButton><Modal.Title>{editingProduct ? 'Cập nhật' : 'Thêm mới'}</Modal.Title></Modal.Header>
            <Modal.Body>
               {error.product && <div className="alert alert-danger">{error.product}</div>}
               <Form onSubmit={submitProduct}>
                  <div className="row">
                    <div className="col-md-12 mb-3">
                      <Form.Label>Tên sản phẩm</Form.Label>
                      <Form.Control required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <Form.Label>Danh mục</Form.Label>
                      <Form.Select required value={productForm.category} onChange={async (e) => {
                          const catId = e.target.value;
                          setProductForm({ ...productForm, category: catId, brand: '' });
                          if(catId) { const res = await api.get(`/brands?category=${catId}`); setBrands(res.data.brands); }
                      }}>
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

                    {/* === INPUT BIẾN THỂ (MỚI) === */}
                    <div className="col-12 mb-3">
                      <Form.Label className="fw-bold text-primary">Biến thể sản phẩm (Ít nhất 2)</Form.Label>
                      <div className="bg-light p-3 rounded border">
                        {variants.map((variant, index) => (
                          <div key={index} className="row mb-2 align-items-end">
                            <div className="col-md-5">
                              <small>Tên (VD: 16GB - Đen)</small>
                              <Form.Control size="sm" required value={variant.name} onChange={(e) => handleVariantChange(index, 'name', e.target.value)} />
                            </div>
                            <div className="col-md-3">
                              <small>Giá (VNĐ)</small>
                              <Form.Control size="sm" required value={variant.price ? Number(variant.price).toLocaleString() : ''} onChange={(e) => handleVariantChange(index, 'price', e.target.value)} />
                            </div>
                            <div className="col-md-2">
                              <small>Kho</small>
                              <Form.Control size="sm" required type="number" value={variant.stock} onChange={(e) => handleVariantChange(index, 'stock', e.target.value)} />
                            </div>
                            <div className="col-md-2">
                               <Button variant="danger" size="sm" className="w-100" onClick={() => removeVariant(index)}><i className="bi bi-trash"></i></Button>
                            </div>
                          </div>
                        ))}
                        <Button variant="outline-primary" size="sm" className="mt-2" onClick={addVariant}>+ Thêm biến thể</Button>
                      </div>
                    </div>

                    {/* INPUT ẢNH GIỮ NGUYÊN */}
                    <div className="col-12 mb-3">
                       <Form.Label>Hình ảnh (Ít nhất 3)</Form.Label>
                       <div className="input-group mb-2">
                        <Form.Control placeholder="Nhập URL ảnh..." value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} />
                        <Button variant="outline-secondary" onClick={handleAddImageUrl} disabled={!imageUrlInput.trim()}>Thêm</Button>
                      </div>
                      <Form.Control type="file" multiple onChange={uploadFileHandler} className="mb-2" />
                      {uploading && <div className="text-muted small">Đang tải ảnh...</div>}
                      <div className="d-flex flex-wrap gap-2 mt-2 p-2 border rounded bg-light" style={{ minHeight: '80px' }}>
                        {images.map((img, idx) => (
                          <div key={idx} className="position-relative" style={{ width: '60px', height: '60px' }}>
                            <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button type="button" className="btn btn-danger btn-sm position-absolute top-0 end-0 p-0" style={{width:'20px', height:'20px'}} onClick={() => handleRemoveImage(idx)}>&times;</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="col-12 mb-3">
                      <Form.Label>Mô tả</Form.Label>
                      <Form.Control as="textarea" rows={3} required value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
                    </div>
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <Button variant="secondary" onClick={resetProduct}>Hủy</Button>
                    <Button type="submit" variant="primary" disabled={uploading}>Lưu</Button>
                  </div>
               </Form>
            </Modal.Body>
          </Modal>

          <div className="col-12">
            {/* Table hiển thị sản phẩm */}
            <div className="table-responsive bg-white rounded shadow-sm">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr><th>#</th><th>Hình</th><th>Tên</th><th>Giá (Min)</th><th>Tổng Kho</th><th>Danh mục</th><th>Hành động</th></tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={p._id}>
                      <td>{i + 1}</td>
                      <td><img src={p.images[0]} alt="" style={{ width: 40, height: 40, objectFit: 'cover' }} /></td>
                      <td>{p.name}</td>
                      <td>{Number(p.price).toLocaleString()}</td>
                      <td><span className={`badge ${p.stock > 0 ? 'bg-success' : 'bg-danger'}`}>{p.stock}</span></td>
                      <td>{p.category?.name}</td>
                      <td>
                        <button className="btn btn-sm btn-warning me-2" onClick={() => editProduct(p)}><i className="bi bi-pencil"></i></button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteProduct(p._id)}><i className="bi bi-trash"></i></button>
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
