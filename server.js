require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import Serverless Functions
const createOrderHandler = require('./api/payment/create-order.js');
const verifyPaymentHandler = require('./api/payment/verify-payment.js');
const checkStatusHandler = require('./api/payment/check-status.js');

// Mount as standard Express POST routes
app.post('/api/payment/create-order', createOrderHandler);
app.post('/api/payment/verify-payment', verifyPaymentHandler);
app.post('/api/payment/check-status', checkStatusHandler);

// Add a test ping route
app.get('/api/ping', (req, res) => res.json({ message: 'Express Server Running' }));

// Start Server
app.listen(PORT, () => {
  console.log(`[Local Backend] Express API Server running on http://localhost:${PORT}`);
  console.log(`[Local Backend] Proxy Vite requests to this port to test Razorpay.`);
});
