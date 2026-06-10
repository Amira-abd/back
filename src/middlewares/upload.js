import multer from 'multer';
import path from 'path';
import fs from 'fs'; // قمنا بإضافة مكتبة fs للتعامل مع ملفات النظام

// التأكد من وجود مجلد uploads، وإذا لم يكن موجوداً يتم إنشاؤه تلقائياً
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// إعداد مكان حفظ الملفات
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); 
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });
export default upload;