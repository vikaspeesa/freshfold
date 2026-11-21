// backend/server.js
// Real Razorpay + Supabase integration example
// npm install express razorpay @supabase/supabase-js cors dotenv

require('dotenv').config();
const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// 1. Create Razorpay Order (called from frontend before checkout)
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, orderId, customerName, mobile } = req.body; // amount in rupees
    const options = {
      amount: amount * 100, // paise
      currency: 'INR',
      receipt: orderId,
      notes: { customerName, mobile }
    };
    const rzpOrder = await razorpay.orders.create(options);
    res.json({ orderId: rzpOrder.id, amount: rzpOrder.amount, currency: rzpOrder.currency });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Verify Payment (called after successful checkout)
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, localOrderId } = req.body;
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

    if (expected === razorpay_signature) {
      // Update order in Supabase
      await supabase.from('orders').update({
        payment_status: 'Paid',
        razorpay_payment_id,
        razorpay_order_id
      }).eq('id', localOrderId);

      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const { sendSMS } = require('./send-sms');

// Send order status SMS
app.post('/api/send-status-sms', async (req, res) => {
  const { mobile, orderId, status } = req.body;
  if (!mobile || !orderId || !status) {
    return res.status(400).json({ error: 'mobile, orderId and status required' });
  }
  const message = `FreshFold: Your order #${orderId} is now "${status}". Thank you!`;
  const result = await sendSMS(mobile, message);
  res.json(result);
});

app.listen(3001, () => console.log('Backend running on http://localhost:3001'));
