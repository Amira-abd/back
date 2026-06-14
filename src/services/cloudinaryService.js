import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'placeholder_cloud',
  api_key: process.env.CLOUDINARY_API_KEY || 'placeholder_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'placeholder_secret',
});

/**
 * Upload buffer to Cloudinary
 * @param {Buffer} fileBuffer 
 * @param {string} folder 
 * @returns {Promise<{secure_url: string, public_id: string}>}
 */
export const uploadBufferToCloudinary = (fileBuffer, folder = 'ecolink') => {
  return new Promise((resolve, reject) => {
    const isConfigured = 
      process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET &&
      !process.env.CLOUDINARY_CLOUD_NAME.includes('placeholder') &&
      !process.env.CLOUDINARY_API_KEY.includes('placeholder') &&
      !process.env.CLOUDINARY_API_SECRET.includes('placeholder');

    if (!isConfigured) {
      console.warn("⚠️ Cloudinary credentials are not fully configured. Falling back to placeholder public URL.");
      const randomId = Math.random().toString(36).substring(7);
      // Fallback placeholder images from unsplash based on context
      const isAvatar = folder.includes('avatar');
      const isContract = folder.includes('contract');
      const mockUrl = isAvatar 
        ? `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=600&auto=format&fit=crop`
        : isContract
        ? `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`
        : `https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=1000&auto=format&fit=crop`;

      return resolve({
        secure_url: mockUrl,
        public_id: `mock_public_id_${randomId}`
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return reject(error);
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id
        });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete resource from Cloudinary
 * @param {string} publicId 
 * @returns {Promise<any>}
 */
export const deleteFromCloudinary = (publicId) => {
  return new Promise((resolve, reject) => {
    if (!publicId || publicId.startsWith('mock_')) {
      return resolve({ result: 'ok' });
    }
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        console.error("Cloudinary deletion error:", error);
        return reject(error);
      }
      resolve(result);
    });
  });
};
