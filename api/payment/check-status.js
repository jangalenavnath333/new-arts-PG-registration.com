const Razorpay = require('razorpay');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay keys missing');
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { order_id } = body;

    if (!order_id) {
      return res.status(400).json({ error: 'order_id is required' });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.fetch(order_id);

    // order.status can be 'created', 'attempted', 'paid'
    if (order.status === 'paid') {
      return res.status(200).json({ success: true, status: 'paid', order });
    } else {
      return res.status(200).json({ success: false, status: order.status, order });
    }
  } catch (error) {
    console.error('[Razorpay Check Status] Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
