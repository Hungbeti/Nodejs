// backend/routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require('../models/Product');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/chat', async (req, res) => {
  const { message } = req.body;

  try {
    const products = await Product.find()
      .limit(20)
      .select('name price category brand variants description');

    const productList = products.map(p => 
      `${p.name} - ${p.price.toLocaleString()}đ ${p.variants?.length > 0 ? `(có ${p.variants.length} phiên bản)` : ''}`
    ).join('\n');

    // FIX: Dùng model Gemini 2.5 Flash (hiện tại, hỗ trợ tốt 2025)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: "Bạn là trợ lý bán hàng thân thiện của PC Shop. Trả lời ngắn gọn, dùng emoji, gợi ý sản phẩm phù hợp từ danh sách có sẵn. Nếu không có sản phẩm phù hợp thì gợi ý tương tự."
    });

    const prompt = `
Danh sách sản phẩm nổi bật:
${productList}

Khách hỏi: "${message}"

Hãy trả lời ngắn gọn, tự nhiên, dùng emoji, và gợi ý sản phẩm nếu phù hợp. Nếu không có sản phẩm phù hợp thì nói "Mình đang cập nhật thêm sản phẩm ạ!".
    `;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    res.json({ reply });

  } catch (error) {
    console.error("Lỗi Gemini AI:", error.message);
    res.status(500).json({ 
      reply: 'Xin lỗi bạn, mình đang hơi mệt. Bạn thử lại sau 30s nhé! 😊' 
    });
  }
});

module.exports = router;