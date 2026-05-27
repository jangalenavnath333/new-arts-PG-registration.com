const Razorpay = require('razorpay');

// WHERE TO ADD RAZORPAY KEY ID AND SECRET:
// Add RAZORPAY_KEY_ID and RAZORPAY_SECRET in your .env file
// Example:
// RAZORPAY_KEY_ID=rzp_test_xxxxxxx
// RAZORPAY_SECRET=xxxxxxxxxxxxxxxxxxxxx

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET;

    console.log('[Razorpay Create Order] RAZORPAY_KEY_ID exists:', !!keyId);
    console.log('[Razorpay Create Order] RAZORPAY_KEY_SECRET exists:', !!keySecret);

    if (!keyId || !keySecret) {
      throw new Error('Razorpay keys are not configured in environment variables.');
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const APPLICATION_FEE = 1; // Change to 500 later for production
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const amount = body.amount || APPLICATION_FEE; // Default to APPLICATION_FEE
    const receipt = body.receipt || `receipt_${Date.now()}`;

    console.log(`[Razorpay Create Order] Processing amount: ${amount} INR`);

    const options = {
      amount: amount * 100, // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: receipt
    };

    const order = await razorpay.orders.create(options);
    
    if (!order) {
      return res.status(500).json({ error: 'Some error occurred' });
    }

    // Attach key_id securely so frontend can initialize SDK without exposing secret
    res.status(200).json({ ...order, key_id: keyId });
  } catch (error) {
    console.error('[Razorpay Create Order] Error:', error.message || error);
    res.status(500).json({ error: error.message || 'Internal server error while creating order' });
  }
};
