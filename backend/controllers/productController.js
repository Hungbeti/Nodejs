// backend/controllers/productController.js
const Product = require('../models/Product');

const searchProducts = async (req, res) => {
  const { keyword } = req.query;

  if (!keyword) return res.json({ products: [], totalPages: 0, currentPage: 1 });

  try {
    const results = await Product.find({
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { brand: { $regex: keyword, $options: 'i' } }
      ]
    }).limit(20); // Giới hạn 20 kết quả để tối ưu hiệu năng

    res.json({ products: results, totalPages: 1, currentPage: 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi khi tìm kiếm sản phẩm" });
  }
};

// Hàm GET danh sách sản phẩm
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

const createProduct = async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    const savedProduct = await newProduct.save();

    res.status(201).json(savedProduct);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('category').populate('brand');

    res.json(updatedProduct);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({message: "Not found"});
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

const addComment = (req, res) => res.json({ message: 'Comment added' });
const addRating = (req, res) => res.json({ message: 'Rating added' });

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addComment,
  addRating,
  searchProducts
};