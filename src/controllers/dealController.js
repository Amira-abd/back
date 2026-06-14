import Deal from ".././models/Deal.js";
import Message from ".././models/Message.js";
import Notification from ".././models/Notification.js";
import Payment from "../models/Payment.js";
import { createNotification } from "../services/notificationService.js";
import { generateContractPdf } from "../services/contractService.js";

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
    let deal = await Deal.findById(req.params.id)
      .populate("buyer", "full_name email")
      .populate("seller", "full_name email")
      .populate("product", "title price quantity unit description");

    if (!deal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    deal.status = "accepted";
    
    // Fallback if price or quantity are not set during negotiation
    if (!deal.offeredPrice && deal.product) {
      deal.offeredPrice = deal.product.price;
    }
    if (!deal.quantity) {
      deal.quantity = deal.product?.quantity || 1;
    }
    
    // Generate B2B contract PDF automatically
    try {
      const contractUrl = await generateContractPdf(deal);
      deal.contractUrl = contractUrl;
    } catch (pdfErr) {
      console.error("Failed to generate deal contract PDF:", pdfErr.message);
    }

    await deal.save();

    const receiverId = deal.buyer._id.toString() === req.user.id ? deal.seller._id : deal.buyer._id;
    await createNotification({
      recipient: receiverId,
      sender: req.user.id,
      type: 'offer_accepted',
      title: 'Deal Accepted',
      description: `Your deal negotiation has been accepted. Contract is ready for download.`,
      entityType: 'Deal',
      entityId: deal._id,
      actionUrl: `/dashboard/chat?dealId=${deal._id}`,
      priority: 'high'
    });

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
    deal.escrowStatus = 'Paid_to_Escrow';
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
        text: `System: Payment of $${deal.offeredPrice || 0} has been confirmed. Transaction ID: ${transactionId}. Escrow status: Paid to Escrow.`,
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

// Internal helper to release supplier payment
const releaseSupplierPaymentInternal = async (deal, req) => {
  deal.escrowStatus = 'Released_to_Supplier';
  deal.status = 'completed'; // Finally mark deal as completed!
  await deal.save();

  // Update the payment record in the database
  const payment = await Payment.findOne({ deal: deal._id });
  if (payment) {
    payment.escrowStatus = 'Released_to_Supplier';
    payment.status = 'paid';
    payment.releasedAt = new Date();
    await payment.save();
  }

  // Emit real-time message
  const io = req.app.get('io');
  if (io) {
    io.to(deal._id.toString()).emit('receiveMessage', {
      _id: `sys-${Date.now()}`,
      deal: deal._id,
      sender: null,
      text: `System: Escrow funds have been successfully released to the Supplier. Deal marked as fully completed.`,
      createdAt: new Date().toISOString()
    });
  }

  // Notify seller
  await createNotification({
    recipient: deal.seller._id || deal.seller,
    type: 'payment_successful',
    title: 'Escrow Funds Released',
    description: `Funds for deal reference ${deal._id} have been released to your corporate account.`,
    entityType: 'Deal',
    entityId: deal._id,
    actionUrl: `/dashboard/chat?dealId=${deal._id}`,
    priority: 'high'
  });
};

// UPDATE ESCROW STATUS
export const updateEscrowStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    // Authorization check: User must be buyer, seller, or admin
    const isSeller = deal.seller.toString() === req.user.id;
    const isBuyer = deal.buyer.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin';
    
    if (!isSeller && !isBuyer && !isAdmin) {
      return res.status(403).json({ success: false, message: "Unauthorized to update escrow status for this deal." });
    }

    // Specific workflow validation
    if (status === 'Shipped') {
      if (!isSeller && !isAdmin) {
        return res.status(403).json({ success: false, message: "Only the seller can mark the shipment as Shipped." });
      }
      if (deal.escrowStatus !== 'Paid_to_Escrow') {
        return res.status(400).json({ success: false, message: "Can only ship if payment is Paid_to_Escrow." });
      }
    }

    deal.escrowStatus = status;
    await deal.save();

    // Update payment escrow status as well
    const payment = await Payment.findOne({ deal: deal._id });
    if (payment) {
      payment.escrowStatus = status;
      await payment.save();
    }

    // Emit real-time message to chat
    const io = req.app.get('io');
    if (io) {
      io.to(deal._id.toString()).emit('receiveMessage', {
        _id: `sys-${Date.now()}`,
        deal: deal._id,
        sender: null,
        text: `System: Escrow status updated to: ${status}.`,
        createdAt: new Date().toISOString()
      });
    }

    // Also create a notification for the other party
    const recipientId = isSeller ? deal.buyer : deal.seller;
    await createNotification({
      recipient: recipientId,
      sender: req.user.id,
      type: 'surplus',
      title: `Deal Escrow Status: ${status}`,
      description: `The deal escrow status has been changed to ${status}.`,
      entityType: 'Deal',
      entityId: deal._id,
      actionUrl: `/dashboard/chat?dealId=${deal._id}`,
      priority: 'medium'
    });

    res.status(200).json({ success: true, deal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CONFIRM RECEIPT AND QUALITY
export const confirmReceipt = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate("buyer", "full_name email")
      .populate("seller", "full_name email")
      .populate("product", "title");

    if (!deal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    // Authorization check: User must be buyer or admin
    const isBuyer = deal.buyer._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'Admin';
    
    if (!isBuyer && !isAdmin) {
      return res.status(403).json({ success: false, message: "Only the buyer can confirm receipt and quality." });
    }

    if (deal.escrowStatus !== 'Shipped') {
      return res.status(400).json({ success: false, message: "Receipt can only be confirmed after shipment." });
    }

    deal.escrowStatus = 'Delivered_and_Verified';
    await deal.save();

    // Update payment status as well
    const payment = await Payment.findOne({ deal: deal._id });
    if (payment) {
      payment.escrowStatus = 'Delivered_and_Verified';
      await payment.save();
    }

    // Emit real-time message
    const io = req.app.get('io');
    if (io) {
      io.to(deal._id.toString()).emit('receiveMessage', {
        _id: `sys-${Date.now()}`,
        deal: deal._id,
        sender: null,
        text: `System: Buyer has confirmed receipt & quality. Status is now Delivered & Verified. Releasing payment...`,
        createdAt: new Date().toISOString()
      });
    }

    // Trigger notification for Seller
    await createNotification({
      recipient: deal.seller._id,
      sender: req.user.id,
      type: 'payment_successful',
      title: 'Shipment Received & Verified',
      description: `Buyer has verified delivery of "${deal.product?.title}". Releasing escrow funds to you.`,
      entityType: 'Deal',
      entityId: deal._id,
      actionUrl: `/dashboard/chat?dealId=${deal._id}`,
      priority: 'high'
    });

    // Automatically release supplier payment
    await releaseSupplierPaymentInternal(deal, req);

    res.status(200).json({ success: true, deal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// RELEASE SUPPLIER PAYMENT
export const releaseSupplierPayment = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }
    
    // Only admin can invoke this manually
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: "Access denied. Admin only." });
    }

    await releaseSupplierPaymentInternal(deal, req);
    res.status(200).json({ success: true, message: "Supplier payment released successfully.", deal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};