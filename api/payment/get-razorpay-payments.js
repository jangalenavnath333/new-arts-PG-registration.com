const Razorpay = require('razorpay');

module.exports = async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_SECRET;

    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'Razorpay keys missing' });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    // Fetch up to 1000 payments
    let allItems = [];
    let skip = 0;
    while(allItems.length < 1000) {
        const response = await razorpay.payments.all({ count: 100, skip: skip });
        if(!response.items || response.items.length === 0) break;
        allItems = allItems.concat(response.items);
        if(response.items.length < 100) break; // Reached the end
        skip += 100;
    }
    const successfulPayments = allItems.filter(p => p.status === 'captured');

    // Only return safe fields to frontend
    const safePayments = successfulPayments.map(p => ({
       id: p.id,
       order_id: p.order_id,
       amount: p.amount / 100,
       email: (p.email || '').toLowerCase(),
       contact: (p.contact || '').replace('+91', ''),
       created_at: p.created_at
    }));

    return res.status(200).json({ success: true, payments: safePayments });
  } catch (error) {
    console.error('Razorpay fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
};
