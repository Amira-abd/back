const mongoose = require('mongoose')

const rfqAttachmentSchema = new mongoose.Schema({
  rfq_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Rfq', required: true },
  file_url: { type: String, required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } })

rfqAttachmentSchema.index({ rfq_id: 1 })

module.exports = mongoose.model('RfqAttachment', rfqAttachmentSchema)
