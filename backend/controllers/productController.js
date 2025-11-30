// backend/controllers/productController.js
const Product = require('../models/Product');
const esClient = require('../config/elasticsearch');
const { indexProduct, removeProduct, INDEX_NAME } = require('../utils/esSync');

// === HÀM TÌM KIẾM BẰNG ELASTICSEARCH (ĐIỂM THƯỞNG) ===
const searchProducts = async (req, res) => {
  const { keyword } = req.query;

  if (!keyword) return res.json([]);

  try {
    const result = await esClient.search({
      index: INDEX_NAME,
      body: {
        query: {
          multi_match: {
            query: keyword,
            fields: ['name^3', 'description', 'brand', 'category'], 
            fuzziness: 'AUTO' // Chấp nhận sai chính tả
          }
        }
      }
    });

    const hits = result.body.hits.hits.map(hit => ({
      _id: hit._id,
      name: hit._source.name,
      price: hit._source.price,
      images: [hit._source.image], 
      description: hit._source.description,
    }));

    res.json({ products: hits, totalPages: 1, currentPage: 1 });
  } catch (err) {
    console.error(err);
    // Fallback về MongoDB nếu ES lỗi
    const fallbackResults = await Product.find({
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ]
    }).limit(10);
    res.json({ products: fallbackResults, totalPages: 1, currentPage: 1 });
  }
};

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

const createProduct = async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    const savedProduct = await newProduct.save();
    
    // Sync sang ElasticSearch
    await indexProduct(savedProduct); 

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
    ).populate('category').populate('brand'); // Populate để lấy tên sync sang ES

    if (updatedProduct) {
      // Sync sang ElasticSearch
      await indexProduct(updatedProduct);
    }

    res.json(updatedProduct);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    
    // Xóa khỏi ElasticSearch
    await removeProduct(req.params.id);

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

// ... (các hàm addComment, addRating giữ nguyên hoặc viết thêm)
const addComment = (req, res) => res.json({ message: 'Comment added' });
const addRating = (req, res) => res.json({ message: 'Rating added' });

// XUẤT ĐÚNG TÊN
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