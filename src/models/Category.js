import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true, 
    unique: true 
  },
  description: { 
    type: String, 
    trim: true 
  },
}, { 
  timestamps: true // ده هيعمل لكِ حقول created_at و updated_at تلقائياً
});

// التصدير بنظام ES6 النظيف
const Category = mongoose.model('Category', categorySchema);
export default Category;