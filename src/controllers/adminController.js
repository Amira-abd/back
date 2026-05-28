import Verification from "../models/userVerification.js"; // التعديل 1: تحويل الـ require لـ import وإضافة .js
import User from "../models/User.js";                 // التعديل 2: تحويل الـ require لـ import وإضافة .js

// 1. جلب كل طلبات التوثيق المعلقة
export const getAllVerifications = async (req, res) => {
  try {
    const verifications = await Verification.find({
      reviewStatus: "pending",
    }).populate("user");

    res.status(200).json(verifications);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// 2. جلب تفاصيل طلب توثيق معين
export const getVerificationDetails = async (req, res) => {
  try {
    const verification = await Verification.findById(req.params.id).populate("user");

    if (!verification) {
      return res.status(404).json({
        message: "Verification not found",
      });
    }

    res.status(200).json(verification);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// 3. قبول طلب التوثيق وتحديث حالة المستخدم
export const approveVerification = async (req, res) => {
  try {
    const verification = await Verification.findById(req.params.id);

    if (!verification) {
      return res.status(404).json({
        message: "Verification not found",
      });
    }

    verification.reviewStatus = "approved";
    verification.reviewedBy = req.user.id;

    await verification.save();

    await User.findByIdAndUpdate(verification.user, {
      isVerified: true,
      verification_status: "verified" // ضفتها لزيادة التوافق مع ملف الـ Middleware اللي عملناه سوا
    });

    res.status(200).json({
      message: "Verification approved",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// 4. رفض طلب التوثيق مع ذكر السبب
export const rejectVerification = async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    const verification = await Verification.findById(req.params.id);

    if (!verification) {
      return res.status(404).json({
        message: "Verification not found",
      });
    }

    verification.reviewStatus = "rejected";
    verification.rejectionReason = rejectionReason;
    verification.reviewedBy = req.user.id;

    await verification.save();

    await User.findByIdAndUpdate(verification.user, {
      verification_status: "rejected"
    });

    res.status(200).json({
      message: "Verification rejected",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};