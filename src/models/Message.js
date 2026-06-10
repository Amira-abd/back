import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  deal: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Deal', 
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  text: { 
    type: String, 
    required: true 
  }
}, { 
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } 
});

const Message = mongoose.model('Message', messageSchema);

export default Message;