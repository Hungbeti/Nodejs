// backend/routes/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Cấu hình lưu trữ
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/'); // Lưu vào thư mục 'uploads' ở root backend
  },
  filename(req, file, cb) {
    // Đặt tên file: tên-gốc-ngày-giờ.ext
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Kiểm tra định dạng file (chỉ ảnh)
function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb('Chỉ chấp nhận file ảnh (jpg, jpeg, png)!');
  }
}

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// Route upload (cho phép upload nhiều file, tối đa 5)
router.post('/', upload.array('images', 5), (req, res) => {
  // Trả về đường dẫn của các file đã upload
  const filePaths = req.files.map(file => `/uploads/${file.filename}`);
  res.send(filePaths);
});

module.exports = router;