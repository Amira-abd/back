const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
  buyer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rfq_offer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'RfqOffer', required: true },
  quantity: { type: Number, required: true, min: 1 },
  total_price: { type: Number, required: true, min: 0 },
  order_status: { type: String, enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  payment_status: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
}, { timestamps: true })

module.exports = mongoose.model('Order', orderSchema)
