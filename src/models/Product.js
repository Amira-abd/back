import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  seller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, trim: true },
  condition: { type: String, enum: ['new', 'used', 'refurbished'], required: true },
  price: { type: Number, required: true, min: 0 },
  city: { type: String, trim: true },
  location: { type: String, trim: true },
  status: { type: String, enum: ['active', 'inactive', 'sold_out'], default: 'active' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

productSchema.index({ seller_id: 1 })
productSchema.index({ category_id: 1 })
productSchema.index({ status: 1 })
productSchema.index({ city: 1 })
productSchema.index({ price: 1 })

const Product = mongoose.model('Product', productSchema);
export default Product;