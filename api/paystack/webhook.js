// POST /api/paystack/webhook — Paystack event receiver. Verifies the
// x-paystack-signature HMAC before trusting anything, then records
// charge.success events into the payments table. This makes Paystack the
// source of truth even if a user closes the tab between paying and the
// client-side save completing.
const crypto = require('crypto');
const { repo, getReadyDb } = require('../_lib');

// Signature is computed over the raw request body, so body parsing is
// disabled and the stream is read manually.
module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return res.status(500).json({ error: 'PAYSTACK_SECRET_KEY is not configured' });
  }

  try {
    const raw = await readRawBody(req);
    const signature = req.headers['x-paystack-signature'];
    const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');
    if (!signature || signature !== expected) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(raw.toString('utf8'));

    if (event.event === 'charge.success' && event.data) {
      const db = await getReadyDb();
      await repo.recordWebhookPayment(db, event.data);
    }

    // Always 200 so Paystack doesn't retry events we've already handled.
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('POST /api/paystack/webhook error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
