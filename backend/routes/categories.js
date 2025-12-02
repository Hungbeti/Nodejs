// backend/routes/categories.js
const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect, admin } = require('../middleware/auth');
const Brand = require('../models/Brand');
const Product = require('../models/Product');

// GET all
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const categories = await Category.find(query).sort({ name: 1 });
    res.json({ categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi tải danh mục' });
  }
});

// CREATE category (admin only)
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ msg: 'Tên danh mục không được để trống' });
    }

    // Sửa: Kiểm tra trùng không phân biệt hoa/thường
    const existing = await Category.findOne({ 
      name: { $regex: `^${name.trim()}$`, $options: 'i' } 
    });
    if (existing) {
      return res.status(400).json({ msg: 'Danh mục đã tồn tại' });
    }

    const category = new Category({ name: name.trim() });
    await category.save();
    res.json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { name } = req.body;
    // Thêm kiểm tra trùng lặp khi PUT
    const existing = await Category.findOne({ 
      name: { $regex: `^${name.trim()}$`, $options: 'i' },
      _id: { $ne: req.params.id }
    });
    if (existing) {
      return res.status(400).json({ msg: 'Tên danh mục đã tồn tại' });
    }

    const category = await Category.findByIdAndUpdate(req.params.id, { name }, { new: true });
    if (!category) return res.status(404).json({ msg: 'Không tìm thấy' });
    res.json(category);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const categoryId = req.params.id;

    // 1. Kiểm tra xem danh mục có tồn tại không
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ msg: 'Không tìm thấy danh mục' });
    }

    // 2. Tìm tất cả ID thương hiệu thuộc danh mục này
    const brandsToDelete = await Brand.find({ category: categoryId }).select('_id');
    const brandIdsToDelete = brandsToDelete.map(b => b._id);

    // 3. Gỡ bỏ (set null) thương hiệu khỏi các sản phẩm liên quan
    if (brandIdsToDelete.length > 0) {
      await Product.updateMany(
        { brand: { $in: brandIdsToDelete } },
        { $set: { brand: null } }
      );
    }

    // 4. Gỡ bỏ (set null) danh mục khỏi các sản phẩm liên quan
    await Product.updateMany(
      { category: categoryId },
      { $set: { category: null } }
    );

    // 5. Xóa tất cả thương hiệu thuộc danh mục này (Theo yêu cầu)
    await Brand.deleteMany({ category: categoryId });
    
    // 6. Xóa chính danh mục đó
    await Category.findByIdAndDelete(categoryId);

    res.json({ msg: 'Đã xóa danh mục và các thương hiệu liên quan' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

module.exports = router;
