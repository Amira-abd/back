import mongoose from 'mongoose';

const rfqSchema = new mongoose.Schema({
  buyer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unit: { type: String, required: true, trim: true },
  location: { type: String, trim: true },
  status: { type: String, enum: ['open', 'closed', 'cancelled'], default: 'open' },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// الـ Indexes ممتازة جداً للأداء وسرعة البحث
rfqSchema.index({ buyer_id: 1 });
rfqSchema.index({ category_id: 1 });
rfqSchema.index({ status: 1 });
rfqSchema.index({ created_at: -1 });

const Rfq = mongoose.model('Rfq', rfqSchema);
export default Rfq;