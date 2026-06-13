import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  full_name: { type: String, required: [true, 'الاسم بالكامل مطلوب'], trim: true },
  email: { type: String, required: [true, 'البريد الإلكتروني مطلوب'], unique: true, lowercase: true, trim: true },
  phone: { type: String, required: false, trim: true },
  password_hash: { type: String, required: false },
  google_id: { type: String, unique: true, sparse: true },
  role: { type: String, enum: ['Buyer', 'Seller', 'Both', 'Admin'], required: [true, 'يجب تحديد نوع الحساب'] },
  
  // الحقل الجديد المسؤول عن تخزين مسار الملف المرفوع
  id_card_path: { type: String, required: false }, 
  national_id_doc: { type: String, required: false },
  company_register_doc: { type: String, required: false },
  tax_certificate_doc: { type: String, required: false },
  profile_image: { type: String, required: false },
  rejection_reason: { type: String, required: false },
  
  is_verified: { type: Boolean, default: false },
  verification_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  city: { type: String, required: false, trim: true },
  address: { type: String, required: false, trim: true },
  resetPasswordToken: { type: String, required: false },
  resetPasswordExpire: { type: Date, required: false }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

const User = mongoose.model('User', userSchema);
export default User;