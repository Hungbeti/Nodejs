// backend/routes/brands.js
const express = require('express');
const router = express.Router();
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const { protect, admin } = require('../middleware/auth');

// LẤY TẤT CẢ THƯƠNG HIỆU (HOẶC THEO CATEGORY)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};

    if (category) {
  // Nếu là ObjectId hợp lệ thì tìm theo ID
      let cat = null;
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        cat = await Category.findById(category);
      } else {
        cat = await Category.findOne({ name: { $regex: `^${category}$`, $options: 'i' } });
      }
      if (!cat) return res.status(404).json({ msg: 'Danh mục không tồn tại' });
      filter.category = cat._id;
    }

    const brands = await Brand.find(filter)
      .populate('category', 'name')
      .sort({ name: 1 });

    res.json({ brands });
  } catch (err) {
    console.error('Lỗi GET /brands:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// THÊM THƯƠNG HIỆU
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, category } = req.body;

    if (!name || !category) {
      return res.status(400).json({ msg: 'Tên và danh mục là bắt buộc' });
    }

    // KIỂM TRA DANH MỤC TỒN TẠI
    const cat = await Category.findById(category);
    if (!cat) return res.status(400).json({ msg: 'Danh mục không tồn tại' });

    // KIỂM TRA TÊN TRÙNG
    const existing = await Brand.findOne({ name: name.trim(), category });
    if (existing) return res.status(400).json({ msg: 'Thương hiệu đã tồn tại trong danh mục này' });

    const brand = await Brand.create({
      name: name.trim(),
      category
    });

    const populated = await Brand.findById(brand._id).populate('category', 'name');
    res.status(201).json(populated);
  } catch (err) {
    console.error('Lỗi POST /brands:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// CẬP NHẬT
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { name, category } = req.body;
    const brandId = req.params.id;

    if (!name || !category) {
      return res.status(400).json({ msg: 'Tên và danh mục là bắt buộc' });
    }

    // KIỂM TRA DANH MỤC
    const cat = await Category.findById(category);
    if (!cat) return res.status(400).json({ msg: 'Danh mục không tồn tại' });

    // KIỂM TRA TRÙNG (TRỪ BẢN THÂN)
    const existing = await Brand.findOne({
      name: name.trim(),
      category,
      _id: { $ne: brandId }
    });
    if (existing) return res.status(400).json({ msg: 'Thương hiệu đã tồn tại' });

    const updated = await Brand.findByIdAndUpdate(
      brandId,
      { name: name.trim(), category },
      { new: true }
    ).populate('category', 'name');

    if (!updated) return res.status(404).json({ msg: 'Không tìm thấy thương hiệu' });

    res.json(updated);
  } catch (err) {
    console.error('Lỗi PUT /brands:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// XÓA
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return res.status(404).json({ msg: 'Không tìm thấy thương hiệu' });

    await Brand.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Đã xóa thương hiệu' });
  } catch (err) {
    console.error('Lỗi DELETE /brands:', err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

module.exports = router;