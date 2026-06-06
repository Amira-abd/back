// const jwt = require('jsonwebtoken')
// const User = require('../models/User')

//   const protect = async (req, res, next) => {
  
 
//   try {
//     let token
//     if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
//       token = req.headers.authorization.split(' ')[1]
//     }
//     if (!token) {
//       return res.status(401).json({ message: 'Not authorized, no token provided' })
//     }
//     const decoded = jwt.verify(token, process.env.JWT_SECRET)
//     req.user = await User.findById(decoded.id).select('-password')
//     if (!req.user) {
//       return res.status(401).json({ message: 'Not authorized, user not found' })
//     }
//     next()
//   } catch (err) {
//     return res.status(401).json({ message: 'Not authorized, token invalid' })
//   }
// }

// const requireVerifiedSeller = (req, res, next) => {
//   if (!req.user || req.user.role !== 'seller' || (req.user.verification_status !== 'verified' && req.user.verification_status !== 'approved')) {
//     return res.status(403).json({ message: 'Access denied, verified seller only' })
//   }
//   next()
// }

// module.exports = { protect, requireVerifiedSeller }
import jwt from "jsonwebtoken";
import User from "../models/User.js"; // لازم نستورد الموديل عشان نبحث في قاعدة البيانات

export const protect = async (req, res, next) => { // ضفنا async هنا
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // التعديل المهم هنا: البحث عن المستخدم في قاعدة البيانات وتخزينه في req.user
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    req.user = user; // دلوقت الـ req.user بقى فيه بيانات المستخدم كاملة
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

export const requireVerifiedSeller = (req, res, next) => {
  // عدلتها برضه عشان تتماشى مع الـ fields الحقيقية في الـ Schema بتاعك
  if (!req.user || (req.user.role !== 'seller' && req.user.verification_status !== 'approved')) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only verified sellers can perform this action.",
    });
  }
  next();
};