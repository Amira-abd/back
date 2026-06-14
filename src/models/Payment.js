import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    required: false
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false
  },
  rfq: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rfq',
    required: false
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, "Amount must be greater than zero"]
  },
  currency: {
    type: String,
    required: true,
    default: 'usd'
  },
  paymentIntentId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  escrowStatus: {
    type: String,
    enum: ['Pending', 'Paid_to_Escrow', 'Shipped', 'Delivered_and_Verified', 'Released_to_Supplier'],
    default: 'Pending'
  },
  releasedAt: {
    type: Date
  },
  shippingProvider: {
    type: String
  },
  shippingCost: {
    type: Number
  },
  shippingWeight: {
    type: Number
  },
  shippingVolume: {
    type: Number
  },
  shippingDistance: {
    type: Number
  }
}, { 
  timestamps: true 
});

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
