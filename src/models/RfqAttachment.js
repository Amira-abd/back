import mongoose from 'mongoose';

const rfqAttachmentSchema = new mongoose.Schema({
  rfq_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Rfq', 
    required: true 
  },
  file_url: { 
    type: String, 
    required: true 
  },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// الـ Index ممتاز وسليم جداً لسرعة جلب المرفقات الخاصة بكل طلب
rfqAttachmentSchema.index({ rfq_id: 1 });

const RfqAttachment = mongoose.model('RfqAttachment', rfqAttachmentSchema);
export default RfqAttachment;