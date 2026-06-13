import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false 
  },
  type: { 
    type: String, 
    required: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  entityType: { 
    type: String, 
    required: false 
  },
  entityId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: false 
  },
  actionUrl: { 
    type: String, 
    required: false 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'],
    default: 'medium' 
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
  readAt: {
    type: Date,
    required: false
  }
}, { 
  timestamps: true 
});

// Indexes requested: recipient, isRead, createdAt
notificationSchema.index({ recipient: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ createdAt: -1 });

// Extra compound index for fast retrieval of recipient's newest
notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
