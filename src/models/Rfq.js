import mongoose from 'mongoose';

const allowedUnits = [
  // English
  'kg', 'kilogram', 'kilograms',
  'ton', 'tons', 'tonne', 'tonnes',
  'piece', 'pieces', 'pcs', 'pc',
  'liter', 'liters', 'litre', 'litres', 'l',
  'm', 'meter', 'meters', 'metre', 'metres',
  'm2', 'sqm', 'square meter', 'square meters',
  'm3', 'cbm', 'cubic meter', 'cubic meters',
  'g', 'gram', 'grams',
  'lbs', 'pound', 'pounds',
  // Arabic
  'طن', 'طنان', 'أطنان',
  'كجم', 'كيلوجرام', 'كيلو جرام',
  'قطعة', 'قطعه', 'قطع',
  'لتر', 'لترات',
  'متر', 'أمتار',
  'متر مربع', 'متر مكعب',
  'جرام', 'جرامات'
];

const rfqSchema = new mongoose.Schema({
  buyer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  title: { type: String, required: true, trim: true },
  description: { 
    type: String, 
    required: true,
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
    validate: {
      validator: function(v) {
        return /[a-zA-Z\u0600-\u06FF]/.test(v);
      },
      message: 'Description must contain meaningful text and cannot be purely numeric or symbols.'
    }
  },
  quantity: { type: Number, required: true, min: 1 },
  unit: { 
    type: String, 
    required: true, 
    trim: true,
    validate: {
      validator: function(v) {
        return allowedUnits.includes(v.toLowerCase());
      },
      message: props => `"${props.value}" is not a valid measurement unit.`
    }
  },
  location: { type: String, trim: true },
  status: { type: String, enum: ['open', 'closed', 'cancelled', 'accepted'], default: 'open' },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// الـ Indexes ممتازة جداً للأداء وسرعة البحث
rfqSchema.index({ buyer_id: 1 });
rfqSchema.index({ category_id: 1 });
rfqSchema.index({ status: 1 });
rfqSchema.index({ created_at: -1 });

const Rfq = mongoose.model('Rfq', rfqSchema);
export default Rfq;