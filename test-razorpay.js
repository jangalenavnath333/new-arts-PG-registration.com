require('dotenv').config();
const Razorpay = require('razorpay');

async function testKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_SECRET;
  
  console.log('Testing with ID:', keyId);
  console.log('Testing with Secret:', keySecret);
  
  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  try {
    const order = await razorpay.orders.create({
      amount: 100,
      currency: "INR",
      receipt: "test_receipt"
    });
    console.log('SUCCESS:', order.id);
  } catch (err) {
    console.error('FAILED:', err);
  }
}

testKeys();
