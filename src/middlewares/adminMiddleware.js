import User from "../models/User.js"; // التعديل 1: تحويل الـ require لـ import وإضافة امتداد .js

const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user || req.user.role?.toLowerCase() !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins only.",
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default adminMiddleware; // التعديل 2: تحويل التصدير لـ export default