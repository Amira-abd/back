import axios from 'axios';
import Payment from '../models/Payment.js';
import Deal from '../models/Deal.js';
import User from '../models/User.js';
import { createNotification } from '../services/notificationService.js';
import { generatePaymobCheckout } from '../services/paymentService.js';

// Helper to make Stripe API requests directly (avoiding the need for Stripe npm package)
const stripeRequest = async (method, path, data = null) => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey || stripeSecretKey.startsWith('sk_test_mock')) {
    throw new Error('STRIPE_SECRET_KEY_NOT_CONFIGURED');
  }

  const url = `https://api.stripe.com/v1${path}`;
  let body = null;

  if (data) {
    const params = new URLSearchParams();
    const serialize = (obj, prefix = '') => {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const k = prefix ? `${prefix}[${key}]` : key;
          const v = obj[key];
          if (v !== null && typeof v === 'object') {
            serialize(v, k);
          } else if (v !== undefined) {
            params.append(k, String(v));
          }
        }
      }
    };
    serialize(data);
    body = params.toString();
  }

  const response = await axios({
    method,
    url,
    data: body,
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return response.data;
};

// Create Stripe Payment Intent and track in database
export const createPaymentIntent = async (req, res) => {
  try {
    const { dealId } = req.body;
    if (!dealId) {
      return res.status(400).json({ success: false, message: 'Deal ID is required.' });
    }

    const deal = await Deal.findById(dealId).populate('product');
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found.' });
    }

    // Check if duplicate payments exist
    const existingPaidPayment = await Payment.findOne({ deal: dealId, status: 'paid' });
    if (existingPaidPayment) {
      return res.status(400).json({ success: false, message: 'This deal has already been paid.' });
    }

    // Calculate pricing: subtotal + 2% platform fee
    const itemPrice = deal.offeredPrice || 0;
    const quantity = deal.quantity || 1;
    const subtotal = itemPrice * quantity;
    const platformFee = subtotal * 0.02;
    const finalAmount = subtotal + platformFee;

    if (finalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
    }

    let paymentIntentId = `pi_mock_${Date.now()}`;
    let clientSecret = `pi_mock_secret_${Date.now()}`;
    let stripeConfigured = false;

    try {
      // Create Stripe payment intent in cents
      const amountInCents = Math.round(finalAmount * 100);
      const stripeIntent = await stripeRequest('POST', '/payment_intents', {
        amount: amountInCents,
        currency: 'usd',
        payment_method_types: ['card'],
        metadata: {
          dealId: deal._id.toString(),
          buyerId: deal.buyer.toString(),
          sellerId: deal.seller.toString()
        }
      });

      if (stripeIntent && stripeIntent.id) {
        paymentIntentId = stripeIntent.id;
        clientSecret = stripeIntent.client_secret;
        stripeConfigured = true;
      }
    } catch (stripeErr) {
      console.warn('Stripe Integration Warning (Fallback to Simulated Checkout):', stripeErr.message);
    }

    // Save/Update Payment Record
    let payment = await Payment.findOne({ deal: dealId, status: 'pending' });
    if (!payment) {
      payment = new Payment({
        buyer: deal.buyer,
        seller: deal.seller,
        deal: dealId,
        product: deal.product?._id,
        amount: finalAmount,
        currency: 'usd',
        paymentIntentId,
        status: 'pending'
      });
    } else {
      payment.amount = finalAmount;
      payment.paymentIntentId = paymentIntentId;
    }
    await payment.save();

    // Trigger Payment Pending Notification
    await createNotification({
      recipient: deal.buyer,
      sender: deal.seller,
      type: 'payment_pending',
      title: 'Payment Pending',
      description: `Secured escrow payment of $${finalAmount.toFixed(2)} for "${deal.product?.title || 'Material Batch'}" is pending confirmation.`,
      entityType: 'Deal',
      entityId: deal._id,
      actionUrl: `/payment/${deal._id}`,
      priority: 'medium'
    });

    res.status(200).json({
      success: true,
      clientSecret,
      paymentIntentId,
      amount: finalAmount,
      stripeConfigured,
      payment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create payment intent.', error: error.message });
  }
};

// Confirm secure card payments and update MongoDB transaction records
export const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, isMockSuccess } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: 'Payment Intent ID is required.' });
    }

    const payment = await Payment.findOne({ paymentIntentId }).populate('deal');
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    if (payment.status === 'paid') {
      return res.status(200).json({ success: true, message: 'Payment was already confirmed.', payment });
    }

    let paymentStatus = 'paid';

    // Verify Stripe payment intent directly if it is not a mock transaction
    if (!paymentIntentId.startsWith('pi_mock')) {
      try {
        const stripeIntent = await stripeRequest('GET', `/payment_intents/${paymentIntentId}`);
        if (stripeIntent && stripeIntent.status !== 'succeeded') {
          paymentStatus = 'failed';
        }
      } catch (stripeErr) {
        console.error('Stripe Intent Verification Error:', stripeErr.message);
        if (isMockSuccess === false) {
          paymentStatus = 'failed';
        }
      }
    } else {
      // Mock payment intent resolution
      if (isMockSuccess === false) {
        paymentStatus = 'failed';
      }
    }

    payment.status = paymentStatus;
    await payment.save();

    const deal = await Deal.findById(payment.deal);
    if (deal) {
      deal.paymentStatus = paymentStatus;
      if (paymentStatus === 'paid') {
        deal.status = 'completed';
        deal.transactionId = paymentIntentId;
      }
      await deal.save();
    }

    // Trigger Notification for success/failure
    if (paymentStatus === 'paid') {
      await createNotification({
        recipient: payment.buyer,
        sender: payment.seller,
        type: 'payment_successful',
        title: 'Payment Successful',
        description: `Your payment of $${payment.amount.toFixed(2)} was securely processed and held in escrow.`,
        entityType: 'Deal',
        entityId: payment.deal,
        actionUrl: `/payment/success/${paymentIntentId}`,
        priority: 'high'
      });

      await createNotification({
        recipient: payment.seller,
        sender: payment.buyer,
        type: 'payment_successful',
        title: 'Payment Received',
        description: `Escrow payment of $${payment.amount.toFixed(2)} has been secured. Please schedule material dispatch.`,
        entityType: 'Deal',
        entityId: payment.deal,
        actionUrl: `/dashboard/chat?dealId=${payment.deal}`,
        priority: 'high'
      });

      // Emit real-time Socket.IO notification to update chat
      const io = req.app.get('io');
      if (io && payment.deal) {
        io.to(payment.deal.toString()).emit('receiveMessage', {
          _id: `sys-${Date.now()}`,
          deal: payment.deal,
          sender: null,
          text: `System: Secure Escrow Payment of $${payment.amount.toFixed(2)} was successfully processed. Status is now completed.`,
          createdAt: new Date().toISOString()
        });
      }
    } else {
      await createNotification({
        recipient: payment.buyer,
        sender: payment.seller,
        type: 'payment_failed',
        title: 'Payment Failed',
        description: `Secured checkout payment of $${payment.amount.toFixed(2)} has failed. Please verify your billing details.`,
        entityType: 'Deal',
        entityId: payment.deal,
        actionUrl: `/payment/${payment.deal}`,
        priority: 'high'
      });
    }

    res.status(200).json({
      success: paymentStatus === 'paid',
      message: paymentStatus === 'paid' ? 'Payment confirmed successfully.' : 'Payment failed.',
      payment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to confirm payment.', error: error.message });
  }
};

// Get details for a specific payment transaction
export const getPaymentDetails = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('buyer', 'full_name email phone')
      .populate('seller', 'full_name email phone')
      .populate({
        path: 'deal',
        populate: { path: 'product' }
      });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment details not found.' });
    }

    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};

// Update status of payment records (refunded, etc.)
export const updatePaymentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'processing', 'paid', 'failed', 'refunded'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid payment status.' });
    }

    const payment = await Payment.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    // Trigger Notification for refund/update
    if (status === 'refunded') {
      await createNotification({
        recipient: payment.buyer,
        sender: payment.seller,
        type: 'payment_refunded',
        title: 'Payment Refunded',
        description: `Escrow payment of $${payment.amount.toFixed(2)} was successfully refunded to your account.`,
        entityType: 'Deal',
        entityId: payment.deal,
        actionUrl: `/dashboard/chat?dealId=${payment.deal}`,
        priority: 'high'
      });
      
      await createNotification({
        recipient: payment.seller,
        sender: payment.buyer,
        type: 'payment_refunded',
        title: 'Transaction Refunded',
        description: `Deal contract payment of $${payment.amount.toFixed(2)} was refunded.`,
        entityType: 'Deal',
        entityId: payment.deal,
        actionUrl: `/dashboard/chat?dealId=${payment.deal}`,
        priority: 'medium'
      });
    }

    res.status(200).json({ success: true, message: `Payment status updated to ${status}.`, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update payment status.', error: error.message });
  }
};

// Create Paymob checkout and key
export const createPaymobKey = async (req, res) => {
  try {
    const { dealId } = req.body;
    if (!dealId) {
      return res.status(400).json({ success: false, message: 'Deal ID is required.' });
    }

    const deal = await Deal.findById(dealId).populate('product');
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found.' });
    }

    // Check duplicate paid payment
    const existingPaidPayment = await Payment.findOne({ deal: dealId, status: 'paid' });
    if (existingPaidPayment) {
      return res.status(400).json({ success: false, message: 'This deal has already been paid.' });
    }

    // Calculate total pricing
    const itemPrice = deal.offeredPrice || 0;
    const quantity = deal.quantity || 1;
    const subtotal = itemPrice * quantity;
    const platformFee = subtotal * 0.02;
    const finalAmount = subtotal + platformFee;

    if (finalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
    }

    const buyerUser = await User.findById(deal.buyer);
    const billingData = {
      first_name: buyerUser.full_name?.split(' ')[0] || 'Buyer',
      last_name: buyerUser.full_name?.split(' ')[1] || 'Enterprise',
      email: buyerUser.email,
      phone_number: buyerUser.phone || '01000000000',
      city: buyerUser.city || 'NA',
      street: buyerUser.address || 'NA'
    };

    const checkoutData = await generatePaymobCheckout(finalAmount, billingData, 'USD');

    // Create or update pending Payment in DB
    const uniquePaymentIntentId = checkoutData.isMock ? checkoutData.paymentKey : `paymob_intent_${checkoutData.orderId}`;
    
    let payment = await Payment.findOne({ deal: dealId, status: 'pending' });
    if (!payment) {
      payment = new Payment({
        buyer: deal.buyer,
        seller: deal.seller,
        deal: dealId,
        product: deal.product?._id,
        amount: finalAmount,
        currency: 'usd',
        paymentIntentId: uniquePaymentIntentId,
        status: 'pending'
      });
    } else {
      payment.amount = finalAmount;
      payment.paymentIntentId = uniquePaymentIntentId;
    }
    await payment.save();

    // Trigger Payment Pending Notification
    await createNotification({
      recipient: deal.buyer,
      sender: deal.seller,
      type: 'payment_pending',
      title: 'Paymob Payment Pending',
      description: `Secured escrow payment of $${finalAmount.toFixed(2)} for "${deal.product?.title || 'Material Batch'}" via Paymob is pending confirmation.`,
      entityType: 'Deal',
      entityId: deal._id,
      actionUrl: `/payment/${deal._id}`,
      priority: 'medium'
    });

    res.status(200).json({
      success: true,
      iframeUrl: checkoutData.iframeUrl,
      paymentIntentId: uniquePaymentIntentId,
      amount: finalAmount,
      isMock: checkoutData.isMock,
      payment
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create Paymob checkout.', error: error.message });
  }
};

// Handle Paymob transaction callback webhooks
export const handlePaymobWebhook = async (req, res) => {
  try {
    const transaction = req.body.obj;
    if (!transaction) {
      return res.status(400).json({ success: false, message: 'Invalid payload.' });
    }

    const orderId = transaction.order?.id;
    const isSuccess = transaction.success;
    const transactionId = transaction.id;

    // Locate the payment record
    const paymentIntentId = `paymob_intent_${orderId}`;
    const payment = await Payment.findOne({ 
      $or: [
        { paymentIntentId },
        { paymentIntentId: String(orderId) },
        { paymentIntentId: String(transactionId) }
      ]
    }).populate('deal');

    if (!payment) {
      console.warn(`Paymob Webhook Warning: Payment record for order ${orderId} / txn ${transactionId} not found.`);
      return res.status(200).json({ success: true, message: 'Payment record not found, webhook acknowledged.' });
    }

    if (payment.status === 'paid') {
      return res.status(200).json({ success: true, message: 'Payment was already confirmed.' });
    }

    const paymentStatus = isSuccess ? 'paid' : 'failed';
    payment.status = paymentStatus;
    if (transactionId) {
      payment.paymentIntentId = `paymob_txn_${transactionId}`;
    }
    await payment.save();

    const deal = await Deal.findById(payment.deal);
    if (deal) {
      deal.paymentStatus = paymentStatus;
      if (paymentStatus === 'paid') {
        deal.status = 'completed';
        deal.transactionId = `paymob_txn_${transactionId}`;
      }
      await deal.save();
    }

    // Trigger Notification for success/failure
    if (paymentStatus === 'paid') {
      await createNotification({
        recipient: payment.buyer,
        sender: payment.seller,
        type: 'payment_successful',
        title: 'Paymob Payment Successful',
        description: `Your payment of $${payment.amount.toFixed(2)} via Paymob was securely processed and held in escrow.`,
        entityType: 'Deal',
        entityId: payment.deal,
        actionUrl: `/payment/success/paymob_txn_${transactionId}`,
        priority: 'high'
      });

      await createNotification({
        recipient: payment.seller,
        sender: payment.buyer,
        type: 'payment_successful',
        title: 'Payment Received',
        description: `Escrow payment of $${payment.amount.toFixed(2)} has been secured. Please schedule material dispatch.`,
        entityType: 'Deal',
        entityId: payment.deal,
        actionUrl: `/dashboard/chat?dealId=${payment.deal}`,
        priority: 'high'
      });

      // Emit real-time Socket.IO notification
      const io = req.app.get('io');
      if (io && payment.deal) {
        io.to(payment.deal.toString()).emit('receiveMessage', {
          _id: `sys-${Date.now()}`,
          deal: payment.deal,
          sender: null,
          text: `System: Paymob Escrow Payment of $${payment.amount.toFixed(2)} was successfully processed. Status is completed.`,
          createdAt: new Date().toISOString()
        });
      }
    } else {
      await createNotification({
        recipient: payment.buyer,
        sender: payment.seller,
        type: 'payment_failed',
        title: 'Paymob Payment Failed',
        description: `Secured Paymob payment of $${payment.amount.toFixed(2)} has failed. Please verify your billing details.`,
        entityType: 'Deal',
        entityId: payment.deal,
        actionUrl: `/payment/${payment.deal}`,
        priority: 'high'
      });
    }

    res.status(200).json({ success: true, message: 'Webhook processed successfully.', paymentStatus });

  } catch (error) {
    console.error('Paymob Webhook Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error processing webhook.' });
  }
};

