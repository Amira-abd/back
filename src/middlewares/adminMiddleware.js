import User from "../models/User.js"; // التعديل 1: تحويل الـ require لـ import وإضافة امتداد .js

const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") { // زيادة أمان: التأكد إن req.user موجود أصلاً
      return res.status(403).json({
        message: "Access denied, admin only",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export default adminMiddleware; // التعديل 2: تحويل التصدير لـ export default