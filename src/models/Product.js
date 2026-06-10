import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  seller_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true // تم تضمين الـ index داخل الحقل مباشرة
  },
  category_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: true,
    index: true 
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, trim: true },
  condition: { 
    type: String, 
    enum: ['new', 'used', 'refurbished'], 
    required: true 
  },
  price: { type: Number, min: 0, default: 0 },
  city: { type: String, trim: true, index: true },
  location: { type: String, trim: true },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'sold_out'], 
    default: 'active',
    index: true 
  },
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true }, // تفعيل ظهور الـ virtuals عند التحويل لـ JSON
  toObject: { virtuals: true } 
});

// إضافة Virtual للصور لجلبها مباشرة بـ populate
productSchema.virtual('images', {
  ref: 'ProductImage',
  localField: '_id',
  foreignField: 'product_id'
});

// إضافة Text Index لتحسين البحث عن المنتجات
productSchema.index({ title: 'text', description: 'text' });

// الفهارس الأخرى
productSchema.index({ price: 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;