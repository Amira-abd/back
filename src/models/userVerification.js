import mongoose from "mongoose"; // التعديل 1: تحويل الـ require لـ import

const verificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  nationalIdNumber: {
    type: String,
    required: false,
  },

  idImage: {
    type: String,
    required: false,
  },

  selfieImage: {
    type: String,
  },

  companyRegisterDoc: {
    type: String,
  },

  taxCertificateDoc: {
    type: String,
  },

  profileImage: {
    type: String,
  },

  otpVerified: {
    type: Boolean,
    default: false,
  },

  reviewStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },

  rejectionReason: {
    type: String,
  },

  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

// التعديل 2: تحويل التصدير لـ export default
const Verification = mongoose.model('Verification', verificationSchema, 'verifications');
export default Verification;