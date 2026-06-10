import Deal from ".././models/Deal.js";
import Message from ".././models/Message.js";
import Notification from ".././models/Notification.js";
import { createNotification } from "../services/notificationService.js";

// GET ALL DEALS
export const getAllDeals = async (req, res) => {
  try {
    const deals = await Deal.find()
      .populate("buyer", "full_name email")
      .populate("seller", "full_name email")
      .populate("product", "title");

    res.status(200).json(deals);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET MESSAGES
export const getDealMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      deal: req.params.id,
    })
      .populate("sender", "full_name")
      .sort({
        createdAt: 1,
      });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// ACCEPT DEAL
export const acceptDeal = async (req, res) => {
  try {
    const deal = await Deal.findByIdAndUpdate(
      req.params.id,
      {
        status: "accepted",
      },
      {
        new: true,
      }
    );

    if (deal) {
      const receiverId = deal.buyer.toString() === req.user.id ? deal.seller : deal.buyer;
      await createNotification({
        recipient: receiverId,
        sender: req.user.id,
        type: 'offer_accepted',
        title: 'Deal Accepted',
        description: `Your deal negotiation has been accepted.`,
        entityType: 'Deal',
        entityId: deal._id,
        actionUrl: `/dashboard/chat?dealId=${deal._id}`,
        priority: 'high'
      });
    }

    res.status(200).json(deal);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// CREATE DEAL
export const createDeal = async (req, res) => {
  try {
    const { sellerId, productId, offeredPrice, quantity } = req.body;
    const buyerId = req.user.id;

    if (buyerId === sellerId) {
      return res.status(400).json({ success: false, message: "Cannot start negotiation with yourself." });
    }

    let query = { buyer: buyerId, seller: sellerId };
    if (productId) {
      query.product = productId;
    }

    let deal = await Deal.findOne(query)
      .populate("buyer", "full_name email")
      .populate("seller", "full_name email")
      .populate("product", "title");

    if (!deal) {
      deal = new Deal({
        buyer: buyerId,
        seller: sellerId,
        product: productId || undefined,
        offeredPrice: offeredPrice || undefined,
        quantity: quantity || undefined,
        status: "negotiating",
      });
      await deal.save();

      await Message.create({
        deal: deal._id,
        sender: buyerId,
        text: offeredPrice
          ? `Hello, I'm interested in your product and would like to offer $${offeredPrice} for ${quantity || 1} units.`
          : `Hello, I would like to contact you regarding business opportunities.`
      });

      deal = await Deal.findById(deal._id)
        .populate("buyer", "full_name email")
        .populate("seller", "full_name email")
        .populate("product", "title");
        
      await createNotification({
        recipient: sellerId,
        sender: buyerId,
        type: 'new_offer',
        title: 'New Interested Buyer',
        description: offeredPrice
          ? `A buyer is interested in your listing and has offered $${offeredPrice}.`
          : `A buyer started a negotiation chat regarding one of your listings.`,
        entityType: 'Deal',
        entityId: deal._id,
        actionUrl: `/dashboard/chat?dealId=${deal._id}`,
        priority: 'medium'
      });
    }

    res.status(201).json(deal);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET DEAL BY ID
export const getDealById = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate("buyer", "full_name email")
      .populate("seller", "full_name email")
      .populate("product", "title price quantity unit description");

    if (!deal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    res.status(200).json(deal);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PROCESS DEAL PAYMENT
export const processDealPayment = async (req, res) => {
  try {
    const { cardHolderName, cardNumber, cvv, expiryDate } = req.body;
    const deal = await Deal.findById(req.params.id)
      .populate("buyer", "full_name email")
      .populate("seller", "full_name email")
      .populate("product", "title");

    if (!deal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    // Support failed payment simulation if CVV is 999
    if (cvv === '999') {
      deal.paymentStatus = 'failed';
      await deal.save();

      // Create Payment Failed notification
      await createNotification({
        recipient: deal.buyer._id,
        sender: deal.seller._id,
        type: 'payment_successful', // Maps to payment_successful Socket event
        title: 'Payment Failed',
        description: `Your payment of $${deal.offeredPrice || 0} for "${deal.product?.title || 'material'}" has failed. Please verify card details.`,
        entityType: 'Deal',
        entityId: deal._id,
        actionUrl: `/payment/${deal._id}`,
        priority: 'high'
      });

      return res.status(400).json({
        success: false,
        message: "Payment processing failed. Simulated card rejection.",
        paymentStatus: 'failed'
      });
    }

    const transactionId = `TXN-${Date.now()}`;
    deal.paymentStatus = 'paid';
    deal.status = 'completed'; // Change status to completed after payment
    deal.transactionId = transactionId;
    await deal.save();

    // Create notifications for buyer and seller using unified service
    await createNotification({
      recipient: deal.buyer._id,
      sender: deal.seller._id,
      type: 'payment_successful',
      title: 'Payment Successful',
      description: `Your payment of $${deal.offeredPrice || 0} for "${deal.product?.title || 'material'}" was processed successfully.`,
      entityType: 'Deal',
      entityId: deal._id,
      actionUrl: `/payment/success/${transactionId}`,
      priority: 'high'
    });

    await createNotification({
      recipient: deal.seller._id,
      sender: deal.buyer._id,
      type: 'payment_successful',
      title: 'Payment Received',
      description: `Payment of $${deal.offeredPrice || 0} for your listing "${deal.product?.title || 'material'}" has been received.`,
      entityType: 'Deal',
      entityId: deal._id,
      actionUrl: `/dashboard/chat?dealId=${deal._id}`,
      priority: 'high'
    });

    // Real-time socket emissions
    const io = req.app.get('io');
    if (io) {
      // Let the room know payment was successful
      io.to(deal._id.toString()).emit('receiveMessage', {
        _id: `sys-${Date.now()}`,
        deal: deal._id,
        sender: null,
        text: `System: Payment of $${deal.offeredPrice || 0} has been confirmed. Transaction ID: ${transactionId}. Status is now completed.`,
        createdAt: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment successfully confirmed.",
      deal,
      transactionId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CANCEL DEAL PAYMENT
export const cancelDealPayment = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    deal.paymentStatus = 'cancelled';
    await deal.save();

    res.status(200).json({
      success: true,
      message: "Payment was cancelled.",
      deal
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};