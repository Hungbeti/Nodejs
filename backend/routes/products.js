// backend/routes/products.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const { protect, admin } = require('../middleware/auth');

// GET tất cả sản phẩm (Đã sửa lỗi lọc và thêm sort)
router.get('/', async (req, res) => {
  try {
    const {
      search,
      category: categoryName,
      brand: brandName,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 20 // Thêm limit có thể tùy chỉnh
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {};
    let categoryId = null; 

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (categoryName) {
      let cat = null;
      if (categoryName.match(/^[0-9a-fA-F]{24}$/)) {
        cat = await Category.findById(categoryName);
      } else {
        cat = await Category.findOne({ name: { $regex: `^${categoryName.trim()}$`, $options: 'i' } });
      }
      
      if (!cat) return res.json({ products: [], totalPages: 0, currentPage: 1 });
      query.category = cat._id;
      categoryId = cat._id;
    }

    if (brandName) {
      const brandQuery = {
        name: { $regex: `^${brandName}$`, $options: 'i' }
      };
      if (categoryId) {
        brandQuery.category = categoryId;
      }
      const b = await Brand.findOne(brandQuery);
      if (!b) {
        return res.json({ products: [], totalPages: 0, currentPage: 1 });
      }
      query.brand = b._id;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // === CẬP NHẬT SORT OPTIONS ===
    const sortOption = {
      nameAsc: { name: 1 },
      nameDesc: { name: -1 },
      priceAsc: { price: 1 },
      priceDesc: { price: -1 },
      soldDesc: { sold: -1 },     // Hỗ trợ "Bán chạy nhất"
      newest: { createdAt: -1 }   // Hỗ trợ "Sản phẩm mới"
    }[sort] || { createdAt: -1 }; // Mặc định là mới nhất
    // ===========================
    
    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    res.json({
      products: products,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page)
    });
  } catch (err) {
    console.error('Lỗi GET /products:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// === THÊM ROUTE MỚI CHO TRANG CHI TIẾT ===
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('reviews.user', 'name'); // Lấy tên người review

    if (!product) {
      return res.status(404).json({ msg: 'Không tìm thấy sản phẩm' });
    }
    res.json(product);
  } catch (err) {
    console.error('Lỗi GET /products/:id:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// === THÊM ROUTE MỚI ĐỂ REVIEW SẢN PHẨM ===
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    // 1. Kiểm tra đầu vào
    if (!rating || !comment || comment.trim() === '') {
      return res.status(400).json({ msg: 'Vui lòng cung cấp cả sao và bình luận.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Không tìm thấy sản phẩm' });

    // (Logic kiểm tra đã mua hàng)

    const review = {
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment,
    };

    // 2. SỬA LỖI: Khởi tạo mảng nếu nó không tồn tại
    if (!product.reviews) {
      product.reviews = [];
    }
    // ===========================================

    product.reviews.push(review);
    
    await product.save();
    if (req.io) {
      const newReview = product.reviews[product.reviews.length - 1];
      req.io.to(req.params.id).emit('newReview', newReview);
    }
    res.status(201).json({ msg: 'Đã thêm đánh giá' });
    
  } catch (err) {
    // Thêm log chi tiết
    console.error('Lỗi POST /:id/reviews:', err); 
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// === THÊM ROUTE MỚI: BÌNH LUẬN (CHO KHÁCH) ===
router.post('/:id/comments', async (req, res) => {
  try {
    const { name, comment } = req.body;
    
    // Khách thì BẮT BUỘC phải có Tên và Bình luận
    if (!name || !comment || name.trim() === '' || comment.trim() === '') {
      return res.status(400).json({ msg: 'Vui lòng cung cấp tên và bình luận.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Không tìm thấy sản phẩm' });

    const review = {
      user: null, // Không có user
      name: name, // Lấy tên từ form
      rating: null, // Không có sao
      comment,
    };

    if (!product.reviews) {
      product.reviews = [];
    }
    product.reviews.push(review);
    
    await product.save();
    if (req.io) {
      const newComment = product.reviews[product.reviews.length - 1];
      req.io.to(req.params.id).emit('newReview', newComment);
    }
    res.status(201).json({ msg: 'Đã thêm bình luận' });

  } catch (err) {
    console.error('Lỗi POST /:id/comments:', err); 
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// THÊM sản phẩm (admin)
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, price, images, description, stock, category, brand } = req.body;
    const existingProduct = await Product.findOne({ 
      name: { $regex: `^${name}$`, $options: 'i' } 
    });
    
    if (existingProduct) {
      return res.status(400).json({ msg: 'Tên sản phẩm này đã tồn tại' });
    }
    if (category) {
      const cat = await Category.findById(category);
      if (!cat) return res.status(400).json({ msg: 'Danh mục không tồn tại' });
    }
    if (brand) {
      const b = await Brand.findById(brand);
      if (!b) return res.status(400).json({ msg: 'Thương hiệu không tồn tại' });
    }

    const product = new Product({ name, price, images, description, stock, category, brand });
    await product.save();

    const populated = await Product.findById(product._id)
      .populate('category', 'name')
      .populate('brand', 'name');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Lỗi POST /products:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// CẬP NHẬT sản phẩm (admin)
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { category, brand } = req.body;

    if (category) {
      const cat = await Category.findById(category);
      if (!cat) return res.status(400).json({ msg: 'Danh mục không tồn tại' });
    }
    if (brand) {
      const b = await Brand.findById(brand);
      if (!b) return res.status(400).json({ msg: 'Thương hiệu không tồn tại' });
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('category', 'name').populate('brand', 'name');

    if (!updated) return res.status(404).json({ msg: 'Không tìm thấy sản phẩm' });

    res.json(updated);
  } catch (err) {
    console.error('Lỗi PUT /products:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// XÓA sản phẩm (admin)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(4404).json({ msg: 'Không tìm thấy sản phẩm' });

    await Product.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Đã xóa sản phẩm' });
  } catch (err) {
    console.error('Lỗi DELETE /products:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

module.exports = router;