// backend/routes/products.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const { protect, admin } = require('../middleware/auth');

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
      page = 1
    } = req.query;

    const limit = 12;
    const skip = (page - 1) * limit;
    const query = {};

    // Tìm kiếm tên
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Lọc theo danh mục (dùng tên)
    if (categoryName) {
      let cat = null;
  
      // Nếu categoryName là ObjectId hợp lệ => tìm theo ID
      if (categoryName.match(/^[0-9a-fA-F]{24}$/)) {
        cat = await Category.findById(categoryName);
      } else {
        // Nếu không thì tìm theo tên (so khớp chính xác, không dùng regex mở rộng)
        cat = await Category.findOne({ name: categoryName.trim() });
      }

      if (!cat) return res.json({ products: [], totalPages: 0, currentPage: 1 });
      query.category = cat._id;
    }

    // Lọc theo thương hiệu
    if (brandName) {
      const b = await Brand.findOne({
        name: { $regex: `^${brandName}$`, $options: 'i' }
      });
      if (!b) {
        return res.json({ products: [], totalPages: 0, currentPage: 1 });
      }
      query.brand = b._id;
    }

    // Lọc giá
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Sắp xếp
    const sortOption = {
      nameAsc: { name: 1 },
      nameDesc: { name: -1 },
      priceAsc: { price: 1 },
      priceDesc: { price: -1 }
    }[sort] || {};

    // Lấy sản phẩm + populate với điều kiện match
    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.json({
      products: products,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page)
    });
  } catch (err) {
    console.error('Lỗi GET /products:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// THÊM sản phẩm (admin)
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, price, images, description, stock, category, brand } = req.body;

    // Kiểm tra category tồn tại
    if (category) {
      const cat = await Category.findById(category);
      if (!cat) return res.status(400).json({ msg: 'Danh mục không tồn tại' });
    }

    // Kiểm tra brand tồn tại
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
    if (!product) return res.status(404).json({ msg: 'Không tìm thấy sản phẩm' });

    await Product.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Đã xóa sản phẩm' });
  } catch (err) {
    console.error('Lỗi DELETE /products:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

module.exports = router;