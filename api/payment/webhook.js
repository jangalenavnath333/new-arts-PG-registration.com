const crypto = require('crypto');

// WHERE TO ADD WEBHOOK SECRET:
// Add RAZORPAY_WEBHOOK_SECRET in your .env file
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vercel raw body for webhook verification if needed, but simple verification here:
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      // If no secret configured, accept but warn
      console.warn('Webhook secret not configured, skipping validation');
      return res.status(200).json({ status: 'ok' });
    }

    const signature = req.headers['x-razorpay-signature'];
    const bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    
    const expectedSignature = crypto.createHmac('sha256', webhookSecret)
                                    .update(bodyString)
                                    .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Process the webhook payload
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const event = payload.event;
    
    if (event === 'payment.captured') {
      const paymentEntity = payload.payload.payment.entity;
      console.log('Payment Captured Webhook:', paymentEntity);
      // Here you would typically update the database directly via Supabase
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ error: error.message });
  }
};
