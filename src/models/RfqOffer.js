import mongoose from 'mongoose';

const rfqOfferSchema = new mongoose.Schema({
  rfq_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Rfq', required: true },
  seller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  price: { type: Number, required: true, min: [0.01, 'Price must be greater than 0'] },
  delivery_time: { type: String, required: true, trim: true },
  message: { type: String, trim: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// الـ Indexes ممتازة لمنع التكرار وتسريع الاستعلامات
rfqOfferSchema.index({ rfq_id: 1 });
rfqOfferSchema.index({ seller_id: 1 });
rfqOfferSchema.index({ rfq_id: 1, seller_id: 1 }, { unique: true });

const RfqOffer = mongoose.model('RfqOffer', rfqOfferSchema);
export default RfqOffer;