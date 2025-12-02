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
<<<<<<< HEAD
router.post('/', upload.array('images'), (req, res) => {
  // Sửa đoạn map đường dẫn
  const filePaths = req.files.map(file => {
    // Thay thế toàn bộ dấu '\' (Windows) thành '/' (Web chuẩn)
    let cleanPath = file.path.replace(/\\/g, "/");
    
    // Nếu đường dẫn chưa có dấu '/' ở đầu, thêm vào
    if (!cleanPath.startsWith('/')) {
        cleanPath = '/' + cleanPath;
    }
    
    // Nếu file.path chứa cả tên folder cha (vd: 'backend/uploads/...'), hãy cắt bớt
    // Ví dụ chỉ lấy từ '/uploads/...' trở đi
    const uploadIndex = cleanPath.indexOf('/uploads');
    if (uploadIndex !== -1) {
        cleanPath = cleanPath.substring(uploadIndex);
    }

    return cleanPath;
  });

=======
router.post('/', upload.array('images', 5), (req, res) => {
  // Trả về đường dẫn của các file đã upload
  const filePaths = req.files.map(file => `/uploads/${file.filename}`);
>>>>>>> 1b0597093518f1fd9e0f005b48ab1c6559cf8a6b
  res.send(filePaths);
});

module.exports = router;