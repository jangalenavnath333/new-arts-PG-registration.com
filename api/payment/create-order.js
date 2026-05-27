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
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });

    const APPLICATION_FEE = 1; // Change to 500 later for production
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const amount = body.amount || APPLICATION_FEE; // Default to APPLICATION_FEE
    const receipt = body.receipt || `receipt_${Date.now()}`;

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
    res.status(200).json({ ...order, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
};
