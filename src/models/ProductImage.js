import mongoose from 'mongoose';

const productImageSchema = new mongoose.Schema({
  product_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  image_url: { 
    type: String, 
    required: true 
  },
  sort_order: { 
    type: Number, 
    default: 0 
  },
});

// الـ Indexing سليم جداً لتسريع الـ Queries
productImageSchema.index({ product_id: 1 });

const ProductImage = mongoose.model('ProductImage', productImageSchema);
export default ProductImage;