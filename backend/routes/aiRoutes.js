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
      .select('name price category brand variants description stock');

    const productList = products.map(p => {
      // Thông tin cơ bản
      let info = `${p.name} \n   - Giá gốc: ${p.price.toLocaleString()}đ`;

      // Nếu có biến thể, liệt kê chi tiết từng cái
      if (p.variants && p.variants.length > 0) {
        const variantDetails = p.variants.map(v => 
          `   + Bản [${v.name}]: ${Number(v.price).toLocaleString()}đ (${v.stock > 0 ? 'Còn hàng' : 'Hết hàng'})`
        ).join('\n');
        
        info += `\n   - Các phiên bản:\n${variantDetails}`;
      } else {
        info += `\n   - Tình trạng: ${p.stock > 0 ? 'Còn hàng' : 'Hết hàng'}`;
      }
      
      return info;
    }).join('\n\n');

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
      reply: 'Hệ thống đang quá tải một chút, bạn thử lại sau 30s nhé! 😊' 
    });
  }
});

module.exports = router;