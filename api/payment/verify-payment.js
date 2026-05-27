const crypto = require('crypto');

// WHERE TO ADD RAZORPAY SECRET:
// Add RAZORPAY_SECRET in your .env file
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const keySecret = process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new Error('Webhook/Verify secret not configured');

    const expectedSign = crypto
      .createHmac("sha256", keySecret)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      return res.status(200).json({ message: "Payment verified successfully", success: true });
    } else {
      return res.status(400).json({ error: "Invalid signature sent!", success: false });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: error.message });
  }
};
