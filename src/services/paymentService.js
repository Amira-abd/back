import axios from 'axios';

const PAYMOB_BASE_URL = 'https://accept.paymob.com/api';

/**
 * Authenticates with Paymob and returns an auth token.
 */
export const getAuthToken = async () => {
  const apiKey = process.env.PAYMOB_API_KEY;
  if (!apiKey || apiKey.startsWith('mock_')) {
    throw new Error('PAYMOB_API_KEY_NOT_CONFIGURED');
  }

  const response = await axios.post(`${PAYMOB_BASE_URL}/auth/tokens`, {
    api_key: apiKey
  });

  return response.data.token;
};

/**
 * Registers an order in Paymob and returns the order ID.
 */
export const createOrder = async (authToken, amountCents, currency = 'USD') => {
  const response = await axios.post(`${PAYMOB_BASE_URL}/ecommerce/orders`, {
    auth_token: authToken,
    delivery_needed: 'false',
    amount_cents: amountCents,
    currency: currency,
    items: []
  });

  return response.data.id;
};

/**
 * Requests the payment key required to render the checkout iframe.
 */
export const getPaymentKey = async (authToken, amountCents, orderId, billingData, integrationId, currency = 'USD') => {
  const response = await axios.post(`${PAYMOB_BASE_URL}/acceptance/payment_keys`, {
    auth_token: authToken,
    amount_cents: amountCents,
    expiration: 3600,
    order_id: orderId,
    billing_data: {
      apartment: billingData.apartment || 'NA',
      floor: billingData.floor || 'NA',
      street: billingData.street || 'NA',
      building: billingData.building || 'NA',
      physical_filter: 'NA',
      postal_code: billingData.postalCode || 'NA',
      city: billingData.city || 'NA',
      country: billingData.country || 'NA',
      state: billingData.state || 'NA',
      first_name: billingData.first_name || 'Buyer',
      last_name: billingData.last_name || 'Enterprise',
      email: billingData.email || 'buyer@example.com',
      phone_number: billingData.phone_number || '01000000000'
    },
    currency: currency,
    integration_id: integrationId,
    lock_order_when_paid: 'false'
  });

  return response.data.token;
};

/**
 * Orchestrates the full Paymob checkout generation process.
 */
export const generatePaymobCheckout = async (amount, billingData, currency = 'USD') => {
  const apiKey = process.env.PAYMOB_API_KEY;
  const integrationId = process.env.PAYMOB_INTEGRATION_ID || '123456';
  const iframeId = process.env.PAYMOB_IFRAME_ID || '654321';

  // Fallback Simulation Mode
  if (!apiKey || apiKey.startsWith('mock_')) {
    console.warn('Paymob Service: Running in SIMULATED/MOCK mode.');
    const mockOrderId = `pm_order_mock_${Date.now()}`;
    const mockPaymentKey = `pm_key_mock_${Date.now()}`;
    return {
      success: true,
      isMock: true,
      orderId: mockOrderId,
      paymentKey: mockPaymentKey,
      iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${mockPaymentKey}`
    };
  }

  try {
    const amountCents = Math.round(amount * 100);
    const authToken = await getAuthToken();
    const orderId = await createOrder(authToken, amountCents, currency);
    const paymentKey = await getPaymentKey(authToken, amountCents, orderId, billingData, integrationId, currency);

    return {
      success: true,
      isMock: false,
      orderId,
      paymentKey,
      iframeUrl: `${PAYMOB_BASE_URL}/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`
    };
  } catch (error) {
    console.error('Paymob checkout generation failed:', error.message);
    throw error;
  }
};
