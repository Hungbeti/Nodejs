const esClient = require('../config/elasticsearch');

const INDEX_NAME = 'products';

// 1. Tạo Index với mapping tối ưu (thêm để tìm kiếm tiếng Việt tốt hơn)
const createIndex = async () => {
  const exists = await esClient.indices.exists({ index: INDEX_NAME });
  if (!exists) {
    await esClient.indices.create({
      index: INDEX_NAME,
      body: {
        mappings: {
          properties: {
            name: { type: 'text', analyzer: 'standard' },  // Tối ưu tìm kiếm
            description: { type: 'text' },
            category: { type: 'keyword' },
            brand: { type: 'keyword' },
            price: { type: 'float' },
            image: { type: 'keyword' }
          }
        }
      }
    });
    console.log(`Created index: ${INDEX_NAME}`);
  }
};

// 2. Đồng bộ sản phẩm
const indexProduct = async (product) => {
  try {
    await esClient.index({
      index: INDEX_NAME,
      id: product._id.toString(),
      body: {
        name: product.name,
        description: product.description,
        category: product.category?.name || '',
        brand: product.brand?.name || '',
        price: product.price,
        image: product.images?.[0] || ''
      }
    });
  } catch (err) {
    console.error('ES Index Error for product', product._id, err);
  }
};

// 3. Xóa
const removeProduct = async (productId) => {
  try {
    await esClient.delete({
      index: INDEX_NAME,
      id: productId.toString()
    });
  } catch (err) {
    console.error('ES Delete Error:', err);
  }
};

module.exports = { createIndex, indexProduct, removeProduct, INDEX_NAME };