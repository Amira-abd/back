import User from '../models/User.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../services/cloudinaryService.js';
import path from 'path';
import fs from 'fs';

/**
 * Get current user profile details
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password_hash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.status(200).json(user);
  } catch (err) {
    try {
      fs.appendFileSync('error.log', `[GET PROFILE ERROR] ${new Date().toISOString()} - ${err.stack}\n`);
    } catch (e) {}
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Upload or replace profile avatar image
 */
export const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file.' });
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (req.file.size > MAX_SIZE) {
      return res.status(400).json({ success: false, message: 'Image size exceeds 5MB limit.' });
    }

    // Validate formats (JPG, JPEG, PNG, WEBP)
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (!allowedMimes.includes(req.file.mimetype) && !allowedExts.includes(ext)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid file format. Supported formats: JPG, JPEG, PNG, WEBP.' 
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Upload new image buffer to Cloudinary
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, 'ecolink/avatars');

    // Remove old avatar if it exists in Cloudinary
    if (user.avatarPublicId) {
      try {
        await deleteFromCloudinary(user.avatarPublicId);
      } catch (err) {
        console.error("Failed to delete old avatar from Cloudinary:", err.message);
      }
    }

    // Update DB fields (keep profile_image synced for backward compatibility)
    user.avatar = uploadResult.secure_url;
    user.avatarPublicId = uploadResult.public_id;
    user.profile_image = uploadResult.secure_url;

    await user.save();

    const updatedUser = await User.findById(req.user.id).select('-password_hash');
    res.status(200).json(updatedUser);
  } catch (err) {
    try {
      fs.appendFileSync('error.log', `[UPDATE AVATAR ERROR] ${new Date().toISOString()} - ${err.stack}\n`);
    } catch (e) {}
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Remove profile avatar image
 */
export const deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Remove from storage if there's a record
    if (user.avatarPublicId) {
      try {
        await deleteFromCloudinary(user.avatarPublicId);
      } catch (err) {
        console.error("Failed to delete avatar from Cloudinary:", err.message);
      }
    }

    // Clear db fields
    user.avatar = undefined;
    user.avatarPublicId = undefined;
    user.profile_image = undefined;

    await user.save();

    const updatedUser = await User.findById(req.user.id).select('-password_hash');
    res.status(200).json(updatedUser);
  } catch (err) {
    try {
      fs.appendFileSync('error.log', `[DELETE AVATAR ERROR] ${new Date().toISOString()} - ${err.stack}\n`);
    } catch (e) {}
    res.status(500).json({ success: false, message: err.message });
  }
};
