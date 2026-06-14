import multer from 'multer';

// Use memory storage for direct streaming to cloud providers (Cloudinary)
// This is critical for compatibility with serverless deployment platforms like Vercel
const storage = multer.memoryStorage();

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB default general limit
  }
});

export default upload;