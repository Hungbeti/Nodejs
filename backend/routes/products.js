// backend/routes/products.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const { protect, admin } = require('../middleware/auth');

// Helper: Tính tổng tồn kho từ variants
const calculateTotalStock = (variants) => {
  if (!variants) return 0;
  return variants.reduce((acc, curr) => acc + Number(curr.stock), 0);
};

// GET tất cả sản phẩm
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
      limit = 20
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

    const sortOption = {
      nameAsc: { name: 1 },
      nameDesc: { name: -1 },
      priceAsc: { price: 1 },
      priceDesc: { price: -1 },
      soldDesc: { sold: -1 },
      newest: { createdAt: -1 }
    }[sort] || { createdAt: -1 };
    
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

// GET chi tiết sản phẩm
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('reviews.user', 'name');

    if (!product) {
      return res.status(404).json({ msg: 'Không tìm thấy sản phẩm' });
    }
    res.json(product);
  } catch (err) {
    console.error('Lỗi GET /products/:id:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// THÊM SẢN PHẨM (Admin) - CẬP NHẬT LOGIC BIẾN THỂ
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, images, description, category, brand, variants } = req.body;
    
    // 1. Validate variants
    if (!variants || !Array.isArray(variants) || variants.length < 2) {
      return res.status(400).json({ msg: 'Sản phẩm phải có ít nhất 2 biến thể (VD: Màu sắc, Cấu hình...)' });
    }

    // 2. Tự động tính toán
    const displayPrice = Math.min(...variants.map(v => Number(v.price))); // Giá thấp nhất
    const totalStock = calculateTotalStock(variants); // Tổng tồn kho

    const existingProduct = await Product.findOne({ 
      name: { $regex: `^${name}$`, $options: 'i' } 
    });
    if (existingProduct) {
      return res.status(400).json({ msg: 'Tên sản phẩm này đã tồn tại' });
    }

    const product = new Product({ 
      name, 
      price: displayPrice, // Lưu giá thấp nhất
      images, 
      description, 
      stock: totalStock,   // Lưu tổng kho
      category, 
      brand,
      variants             // Lưu chi tiết
    });

    await product.save();
    const populated = await Product.findById(product._id)
      .populate('category', 'name')
      .populate('brand', 'name');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Lỗi POST /products:', err);
    res.status(500).json({ msg: err.message || 'Lỗi server' });
  }
});

// CẬP NHẬT SẢN PHẨM (Admin) - CẬP NHẬT LOGIC BIẾN THỂ
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { variants } = req.body;
    let updateData = { ...req.body };

    // Nếu có cập nhật variants, tính lại price và stock
    if (variants && variants.length > 0) {
      if (variants.length < 2) {
         return res.status(400).json({ msg: 'Phải giữ lại ít nhất 2 biến thể' });
      }
      updateData.price = Math.min(...variants.map(v => Number(v.price)));
      updateData.stock = calculateTotalStock(variants);
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('category', 'name').populate('brand', 'name');

    if (!updated) return res.status(404).json({ msg: 'Không tìm thấy sản phẩm' });

    res.json(updated);
  } catch (err) {
    console.error('Lỗi PUT /products:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// XÓA SẢN PHẨM (Admin)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Không tìm thấy sản phẩm' });

    await Product.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Đã xóa sản phẩm' });
  } catch (err) {
    console.error('Lỗi DELETE /products:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// CÁC ROUTE REVIEW/COMMENT (Giữ nguyên)
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || !comment || comment.trim() === '') {
      return res.status(400).json({ msg: 'Vui lòng cung cấp cả sao và bình luận.' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Không tìm thấy sản phẩm' });

    if (!product.reviews) product.reviews = [];
    
    product.reviews.push({
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment,
    });
    
    await product.save();
    if (req.io) {
      const newReview = product.reviews[product.reviews.length - 1];
      req.io.to(req.params.id).emit('newReview', newReview);
    }
    res.status(201).json({ msg: 'Đã thêm đánh giá' });
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

router.post('/:id/comments', async (req, res) => {
  try {
    const { name, comment } = req.body;
    if (!name || !comment || name.trim() === '' || comment.trim() === '') {
      return res.status(400).json({ msg: 'Vui lòng cung cấp tên và bình luận.' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Không tìm thấy sản phẩm' });

    if (!product.reviews) product.reviews = [];
    product.reviews.push({
      user: null,
      name: name,
      rating: null,
      comment,
    });
    
    await product.save();
    if (req.io) {
      const newComment = product.reviews[product.reviews.length - 1];
      req.io.to(req.params.id).emit('newReview', newComment);
    }
    res.status(201).json({ msg: 'Đã thêm bình luận' });
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

module.exports = router;