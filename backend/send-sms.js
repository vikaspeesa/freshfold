// backend/send-sms.js
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID || 'AC9d17eb53b43cae19cfe20366e81d2761',
  process.env.TWILIO_AUTH_TOKEN || '1359ba37f5042ba1e7e25607c36c0089'
);

async function sendSMS(to, message) {
  // Ensure number is in E.164 format (+91...)
  let phone = to.toString().replace(/\s/g, '');
  if (!phone.startsWith('+')) {
    phone = '+91' + phone; // default India
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER || '+1234567890', // ← replace with your Twilio number
      to: phone
    });
    console.log('SMS sent:', result.sid);
    return { success: true, sid: result.sid };
  } catch (err) {
    console.error('Twilio error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendSMS };
