import Verification from "../models/userVerification.js"; // التعديل 1: تحويل الـ require لـ import وإضافة .js
import User from "../models/User.js";                 // التعديل 2: تحويل الـ require لـ import وإضافة .js
import Notification from "../models/Notification.js";
import { createNotification } from "../services/notificationService.js";

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
      is_verified: true,
      verification_status: "approved"
    });

    // Create Notification using service
    await createNotification({
      recipient: verification.user,
      type: "account_verified",
      title: "Account Approved",
      description: "Your business credentials have been approved! You now have full access to list items and bid on RFQs.",
      entityType: "User",
      entityId: verification.user,
      actionUrl: "/dashboard/profile",
      priority: "high"
    });

    // إرسال تحديث فوري عبر Socket.io للمستخدم
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${verification.user}`).emit('verificationUpdated', {
        is_verified: true,
        verification_status: 'approved'
      });
    }

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
      is_verified: false,
      verification_status: "rejected",
      rejection_reason: rejectionReason
    });

    // Create Notification using service
    await createNotification({
      recipient: verification.user,
      type: "account_rejected",
      title: "Account Rejected",
      description: `Your seller verification was rejected. Reason: ${rejectionReason}`,
      entityType: "User",
      entityId: verification.user,
      actionUrl: "/dashboard/verification",
      priority: "high"
    });

    // إرسال تحديث فوري عبر Socket.io للمستخدم
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${verification.user}`).emit('verificationUpdated', {
        is_verified: false,
        verification_status: 'rejected',
        rejection_reason: rejectionReason
      });
    }

    res.status(200).json({
      message: "Verification rejected",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// 5. Get all users (searchable, filterable by role/verification status)
export const getAllUsers = async (req, res) => {
  try {
    const { search, role, verification_status } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      filter.role = { $regex: new RegExp(`^${role}$`, 'i') };
    }
    if (verification_status) {
      filter.verification_status = verification_status;
    }

    const users = await User.find(filter).select('-password_hash').sort({ created_at: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Get pending users verification requests queue
export const getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ verification_status: 'pending' }).select('-password_hash').sort({ created_at: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Approve user verification status
export const approveUserVerification = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.is_verified = true;
    user.verification_status = 'approved';
    await user.save();

    // Update matching verification document status
    await Verification.findOneAndUpdate(
      { user: userId, reviewStatus: 'pending' },
      { reviewStatus: 'approved', reviewedBy: req.user.id }
    );

    // Create Notification
    await createNotification({
      recipient: userId,
      type: 'account_verified',
      title: 'Account Approved',
      description: 'Your enterprise credentials have been approved! You now have full access to marketplace features.',
      entityType: 'User',
      entityId: userId,
      actionUrl: '/dashboard/profile',
      priority: 'high'
    });

    // Send real-time socket verification update to the user room
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('verificationUpdated', {
        is_verified: true,
        verification_status: 'approved'
      });
    }

    res.status(200).json({ success: true, message: 'User verification status approved.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Reject user verification status with message reason
export const rejectUserVerification = async (req, res) => {
  try {
    const userId = req.params.id;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.is_verified = false;
    user.verification_status = 'rejected';
    user.rejection_reason = rejectionReason;
    await user.save();

    // Update matching verification record
    await Verification.findOneAndUpdate(
      { user: userId, reviewStatus: 'pending' },
      { reviewStatus: 'rejected', rejectionReason, reviewedBy: req.user.id }
    );

    // Trigger reject notification
    await createNotification({
      recipient: userId,
      type: 'account_rejected',
      title: 'Account Rejected',
      description: `Your enterprise registration has been rejected. Reason: ${rejectionReason}`,
      entityType: 'User',
      entityId: userId,
      actionUrl: '/dashboard/verification',
      priority: 'high'
    });

    // Emit real-time Socket.IO update
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('verificationUpdated', {
        is_verified: false,
        verification_status: 'rejected',
        rejection_reason: rejectionReason
      });
    }

    res.status(200).json({ success: true, message: 'User verification status rejected.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};