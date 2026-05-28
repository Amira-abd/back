import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  full_name: { type: String, required: [true, 'الاسم بالكامل مطلوب'], trim: true },
  email: { type: String, required: [true, 'البريد الإلكتروني مطلوب'], unique: true, lowercase: true, trim: true },
  phone: { type: String, required: [true, 'رقم الهاتف مطلوب'], trim: true },
    password_hash: {
    type: String,
    required: false // مش إجباري عشان يوزر جوجل معندوش باسورد في قاعدة بياناتنا
    },
    google_id: {
    type: String,
    unique: true,
    sparse: true // بيسمح إن الحقل يكون فاضي لليوزر العادي ومكررش ليوزر جوجل
    } ,
    role: { type: String, enum: ['Buyer', 'Seller', 'Both'], required: [true, 'يجب تحديد نوع الحساب'] },
  is_verified: { type: Boolean, default: false },
  verification_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  city: { type: String, required: [true, 'المدينة مطلوبة'], trim: true },
  address: { type: String, required: [true, 'العنوان بالتفصيل مطلوب'], trim: true }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

const User = mongoose.model('User', userSchema);
export default User; 