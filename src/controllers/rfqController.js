import Rfq from '../models/Rfq.js';
import RfqAttachment from '../models/RfqAttachment.js';
import RfqOffer from '../models/RfqOffer.js';
import Deal from '../models/Deal.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { createNotification } from '../services/notificationService.js';

const getAllRfqs = async (req, res) => {
  try {
    const { category_id, location, status = 'open', page = 1, limit = 20 } = req.query
    const filter = {}
    if (category_id) filter.category_id = category_id
    if (location) filter.location = { $regex: location, $options: 'i' }
    filter.status = status

    const pageNum = parseInt(page, 10)
    const limitNum = parseInt(limit, 10)
    const skip = (pageNum - 1) * limitNum

    const [data, total] = await Promise.all([
      Rfq.find(filter)
        .populate('buyer_id', 'full_name city')
        .populate('category_id', 'name')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Rfq.countDocuments(filter),
    ])

    res.json({
      data,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getRfqById = async (req, res) => {
  try {
    const rfq = await Rfq.findById(req.params.id)
      .populate('buyer_id', 'full_name city')
      .populate('category_id', 'name')
      .lean()
    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' })
    }

    const [attachments, offersCount] = await Promise.all([
      RfqAttachment.find({ rfq_id: rfq._id }).lean(),
      RfqOffer.countDocuments({ rfq_id: rfq._id }),
    ])

    res.json({ data: { ...rfq, attachments, offersCount } })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// const createRfq = async (req, res) => {
//   try {
//     const { title, description, category_id, quantity, unit, location, attachments } = req.body

//     const rfq = await Rfq.create({
//       buyer_id: req.user._id,
//       title,
//       description,
//       category_id,
//       quantity,
//       unit,
//       location,
//     })

//     if (attachments && Array.isArray(attachments) && attachments.length > 0) {
//       const attachmentDocs = attachments.map((file_url) => ({
//         rfq_id: rfq._id,
//         file_url,
//       }))
//       await RfqAttachment.insertMany(attachmentDocs)
//     }

//     res.status(201).json({ message: 'RFQ created successfully', data: rfq })
//   } catch (err) {
//     res.status(500).json({ message: 'Server error', error: err.message })
//   }
// }
const createRfq = async (req, res) => {
  try {
    // 1. نتأكد إن الـ Middleware اللي قبلنا (protect) مرر بيانات المستخدم
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated or ID missing' });
    }

    const { title, description, category_id, quantity, unit, location, attachments } = req.body;

    // 2. استخدام req.user._id عشان نملأ الـ buyer_id
    const rfq = await Rfq.create({
      buyer_id: req.user._id, 
      title,
      description,
      category_id,
      quantity,
      unit,
      location,
    });

    // 3. معالجة المرفقات (Attachments)
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      const attachmentDocs = attachments.map((file_url) => ({
        rfq_id: rfq._id,
        file_url,
      }));
      await RfqAttachment.insertMany(attachmentDocs);
    }

    // Send request created notification to buyer
    await createNotification({
      recipient: req.user._id,
      type: 'rfq_event',
      title: 'RFQ Request Created',
      description: `Your RFQ "${rfq.title}" has been successfully created.`,
      entityType: 'Rfq',
      entityId: rfq._id,
      actionUrl: `/dashboard/rfqs`,
      priority: 'low'
    });

    // Send request matched notification to categories match verified sellers
    try {
      const matchingSellers = await User.find({
        role: { $in: ['Seller', 'Both'] },
        verification_status: 'approved',
        _id: { $ne: req.user._id }
      }).lean();

      for (const seller of matchingSellers) {
        await createNotification({
          recipient: seller._id,
          type: 'request_matched',
          title: 'Request Matched',
          description: `A buyer is looking for "${rfq.title}" in your business category. Submit your offer!`,
          entityType: 'Rfq',
          entityId: rfq._id,
          actionUrl: `/rfq/${rfq._id}`,
          priority: 'medium'
        });
      }
    } catch (matchErr) {
      console.error('Failed to notify matching sellers:', matchErr);
    }

    res.status(201).json({ message: 'RFQ created successfully', data: rfq });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: Object.values(err.errors).map(e => e.message) 
      });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
const updateRfq = async (req, res) => {
  try {
    const rfq = await Rfq.findById(req.params.id)
    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' })
    }
    if (rfq.buyer_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this RFQ' })
    }
    if (rfq.status !== 'open') {
      return res.status(400).json({ message: 'Cannot update a closed or cancelled RFQ' })
    }

    const { title, description, quantity, unit, location, category_id } = req.body
    if (title !== undefined) rfq.title = title
    if (description !== undefined) rfq.description = description
    if (quantity !== undefined) rfq.quantity = quantity
    if (unit !== undefined) rfq.unit = unit
    if (location !== undefined) rfq.location = location
    if (category_id !== undefined) rfq.category_id = category_id

    await rfq.save()
    res.json({ message: 'RFQ updated successfully', data: rfq })
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: Object.values(err.errors).map(e => e.message) 
      });
    }
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const cancelRfq = async (req, res) => {
  try {
    const rfq = await Rfq.findById(req.params.id)
    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' })
    }
    if (rfq.buyer_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this RFQ' })
    }

    rfq.status = 'cancelled'
    await rfq.save()
    res.json({ message: 'RFQ cancelled successfully' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getMyRfqs = async (req, res) => {
  try {
    const rfqs = await Rfq.find({ buyer_id: req.user._id })
      .populate('category_id', 'name')
      .sort({ created_at: -1 })
      .lean()
    res.json({ data: rfqs })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getRfqOffers = async (req, res) => {
  try {
    const offers = await RfqOffer.find({ rfq_id: req.params.id })
      .populate('seller_id', 'full_name city verification_status')
      .sort({ created_at: -1 })
      .lean();

    const rfq = await Rfq.findById(req.params.id).select('buyer_id').lean();
    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' });
    }

    const updatedOffers = await Promise.all(
      offers.map(async (offer) => {
        if (offer.status === 'accepted') {
          const deal = await Deal.findOne({
            buyer: rfq.buyer_id,
            seller: offer.seller_id,
            product: null
          }).select('_id').lean();
          return {
            ...offer,
            roomId: deal ? deal._id : null
          };
        }
        return offer;
      })
    );

    res.json({ data: updatedOffers })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const sendOffer = async (req, res) => {
  try {
    const rfq = await Rfq.findById(req.params.id)
    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' })
    }
    if (rfq.status !== 'open') {
      return res.status(400).json({ message: 'Cannot send offer on a closed or cancelled RFQ' })
    }
    if (rfq.buyer_id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot send an offer on your own RFQ' })
    }

    const { price, delivery_time, message } = req.body
    const offer = await RfqOffer.create({
      rfq_id: rfq._id,
      seller_id: req.user._id,
      price,
      delivery_time,
      message,
    })

    // Automatically create a Deal (negotiation chat room) between buyer and seller
    const existingDeal = await Deal.findOne({
      buyer: rfq.buyer_id,
      seller: req.user._id,
      product: null
    });

    if (!existingDeal) {
      const deal = await Deal.create({
        buyer: rfq.buyer_id,
        seller: req.user._id,
        status: 'negotiating'
      });

      await Message.create({
        deal: deal._id,
        sender: req.user._id,
        text: `Hello, I have sent a quote of $${price} for your RFQ "${rfq.title}". Delivery: ${delivery_time}. Note: ${message || 'No additional message.'}`
      });
    }

    await createNotification({
      recipient: rfq.buyer_id,
      sender: req.user._id,
      type: 'new_offer',
      title: 'New Offer Received',
      description: `A new offer of $${price} was submitted for your RFQ "${rfq.title}".`,
      entityType: 'RfqOffer',
      entityId: offer._id,
      actionUrl: `/dashboard/rfqs?rfqId=${rfq._id}`,
      priority: 'medium'
    });

    res.status(201).json({ message: 'Offer sent successfully', data: offer })
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: Object.values(err.errors).map(e => e.message) 
      });
    }
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You already sent an offer on this RFQ' })
    }
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const acceptOffer = async (req, res) => {
  try {
    const rfq = await Rfq.findById(req.params.rfqId)
    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' })
    }
    if (rfq.buyer_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept offers on this RFQ' })
    }
    if (rfq.status !== 'open') {
      return res.status(400).json({ message: 'RFQ is not open' })
    }

    const offer = await RfqOffer.findById(req.params.offerId)
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' })
    }
    if (offer.rfq_id.toString() !== rfq._id.toString()) {
      return res.status(400).json({ message: 'Offer does not belong to this RFQ' })
    }

    offer.status = 'accepted'
    await offer.save()

    await RfqOffer.updateMany(
      { rfq_id: rfq._id, _id: { $ne: offer._id } },
      { status: 'rejected' }
    )

    rfq.status = 'accepted'
    await rfq.save()

    const existingDeal = await Deal.findOne({
      buyer: rfq.buyer_id,
      seller: offer.seller_id,
      product: null
    });

    let dealId;
    if (existingDeal) {
      existingDeal.status = 'accepted';
      await existingDeal.save();
      dealId = existingDeal._id;
    } else {
      const newDeal = await Deal.create({
        buyer: rfq.buyer_id,
        seller: offer.seller_id,
        status: 'accepted'
      });
      dealId = newDeal._id;
    }

    // Emit Socket.io real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${rfq.buyer_id}`).emit('chat_room_created', { roomId: dealId, bidId: offer._id });
      io.to(`user_${offer.seller_id}`).emit('chat_room_created', { roomId: dealId, bidId: offer._id });
    }

    await createNotification({
      recipient: offer.seller_id,
      sender: req.user._id,
      type: 'offer_accepted',
      title: 'Offer Accepted',
      description: `Your offer for RFQ "${rfq.title}" has been accepted. You can now chat with the buyer.`,
      entityType: 'RfqOffer',
      entityId: offer._id,
      actionUrl: `/dashboard/my-offers`,
      priority: 'high'
    });

    res.json({ message: 'Offer accepted successfully', data: { offer, roomId: dealId } })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
};

const rejectOffer = async (req, res) => {
  try {
    const rfq = await Rfq.findById(req.params.rfqId)
    if (!rfq) {
      return res.status(404).json({ message: 'RFQ not found' })
    }
    if (rfq.buyer_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject offers on this RFQ' })
    }

    const offer = await RfqOffer.findById(req.params.offerId)
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' })
    }
    if (offer.rfq_id.toString() !== rfq._id.toString()) {
      return res.status(400).json({ message: 'Offer does not belong to this RFQ' })
    }

    offer.status = 'rejected'
    await offer.save()

    await createNotification({
      recipient: offer.seller_id,
      sender: req.user._id,
      type: 'offer_rejected',
      title: 'Offer Rejected',
      description: `Your offer for RFQ "${rfq.title}" has been rejected.`,
      entityType: 'RfqOffer',
      entityId: offer._id,
      actionUrl: `/marketplace`,
      priority: 'low'
    });

    res.json({ message: 'Offer rejected successfully', data: offer })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

const getMyOffers = async (req, res) => {
  try {
    const offers = await RfqOffer.find({ seller_id: req.user._id })
      .populate({
        path: 'rfq_id',
        select: 'title quantity unit category_id',
        populate: { path: 'category_id', select: 'name' },
      })
      .sort({ created_at: -1 })
      .lean()
    res.json({ data: offers })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// التصدير بنظام الـ ES Modules ليتوافق مع الـ Routes بنجاح
export {
  getAllRfqs,
  getRfqById,
  createRfq,
  updateRfq,
  cancelRfq,
  getMyRfqs,
  getRfqOffers,
  sendOffer,
  acceptOffer,
  rejectOffer,
  getMyOffers,
};