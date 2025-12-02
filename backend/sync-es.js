const mongoose = require('mongoose');
const Product = require('./models/Product');
const { indexProduct, createIndex } = require('./utils/esSync');
require('dotenv').config();

const syncData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB Connected. Start Syncing...");
    
    await createIndex();
    
    const products = await Product.find().populate('category').populate('brand');
    console.log(`Found ${products.length} products in MongoDB.`);

    for (const p of products) {
      await indexProduct(p);
      process.stdout.write('.'); // In dấu chấm để biết đang chạy
    }
    
    console.log("\nSync Done!");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

syncData();