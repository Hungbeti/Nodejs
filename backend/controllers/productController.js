// backend/controllers/productController.js
const Product = require('../models/Product');

// Hàm GET danh sách sản phẩm (phải export!)
const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.brand) query.brand = req.query.brand;
    if (req.query.minPrice) query.price = { $gte: req.query.minPrice };
    if (req.query.maxPrice) query.price = { ...query.price, $lte: req.query.maxPrice };
    if (req.query.category) query.category = req.query.category;

    let sort = {};
    if (req.query.sort === 'nameAsc') sort.name = 1;
    if (req.query.sort === 'nameDesc') sort.name = -1;
    if (req.query.sort === 'priceAsc') sort.price = 1;
    if (req.query.sort === 'priceDesc') sort.price = -1;

    const products = await Product.find(query).sort(sort).skip(skip).limit(limit);
    const total = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(total / limit) || 1,
      currentPage: page
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Các hàm khác (có thể để trống tạm)
const getProductById = (req, res) => res.json({ message: 'Product detail' });
const addComment = (req, res) => res.json({ message: 'Comment added' });
const addRating = (req, res) => res.json({ message: 'Rating added' });

// Admin functions
const createProduct = (req, res) => res.json({ message: 'Product created' });
const updateProduct = (req, res) => res.json({ message: 'Product updated' });
const deleteProduct = (req, res) => res.json({ message: 'Product deleted' });

// XUẤT ĐÚNG TÊN
module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addComment,
  addRating
};