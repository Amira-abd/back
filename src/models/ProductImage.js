const mongoose = require('mongoose')

const productImageSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  image_url: { type: String, required: true },
  sort_order: { type: Number, default: 0 },
})

productImageSchema.index({ product_id: 1 })

module.exports = mongoose.model('ProductImage', productImageSchema)
