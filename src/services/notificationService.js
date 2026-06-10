import Notification from '../models/Notification.js';

let ioInstance = null;

/**
 * Initialize the notification service with Socket.IO server instance.
 * @param {object} io - Socket.IO server instance
 */
export const initNotificationService = (io) => {
  ioInstance = io;
  console.log('Notification Service initialized with Socket.IO instance');
};

/**
 * Create a new notification and emit it in real-time.
 * @param {object} params - Notification parameters
 * @param {string} params.recipient - Receiver User ID
 * @param {string} [params.sender] - Sender User ID (optional)
 * @param {string} params.type - Notification type
 * @param {string} params.title - Notification title
 * @param {string} params.description - Notification description
 * @param {string} [params.entityType] - Entity type (Deal, Rfq, Product, User, etc.)
 * @param {string} [params.entityId] - Entity ID
 * @param {string} [params.actionUrl] - Action URL redirect
 * @param {string} [params.priority] - Priority level ('low', 'medium', 'high')
 */
export const createNotification = async ({
  recipient,
  sender,
  type,
  title,
  description,
  entityType,
  entityId,
  actionUrl,
  priority = 'medium'
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      description,
      entityType,
      entityId,
      actionUrl,
      priority
    });

    if (ioInstance) {
      const recipientRoom = `user_${recipient.toString()}`;
      
      // Emit the generic newNotification event for navbar / dropdown
      ioInstance.to(recipientRoom).emit('newNotification', notification);

      // Determine if a specific Socket.IO event needs to be emitted
      let socketEventName = null;
      if (type === 'message') socketEventName = 'new_message';
      else if (type === 'account_verified') socketEventName = 'account_verified';
      else if (type === 'account_rejected') socketEventName = 'account_rejected';
      else if (type === 'new_offer') socketEventName = 'new_offer';
      else if (type === 'offer_accepted') socketEventName = 'offer_accepted';
      else if (type === 'offer_rejected') socketEventName = 'offer_rejected';
      else if (type === 'surplus_published') socketEventName = 'surplus_published';
      else if (type === 'request_matched') socketEventName = 'request_matched';
      else if (type === 'payment_successful') socketEventName = 'payment_successful';

      if (socketEventName) {
        ioInstance.to(recipientRoom).emit(socketEventName, notification);
      }
    }

    return notification;
  } catch (error) {
    console.error('Failed to create or emit notification:', error);
  }
};
