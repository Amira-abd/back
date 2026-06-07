import multer from 'multer';
import path from 'path';

// إعداد مكان حفظ الملفات
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // تأكدي من وجود مجلد باسم uploads في مشروعك
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });
export default upload;