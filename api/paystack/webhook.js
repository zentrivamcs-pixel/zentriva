// POST /api/paystack/webhook — Paystack event receiver. Verifies the
// x-paystack-signature HMAC before trusting anything, then records
// charge.success events into the payments table. This makes Paystack the
// source of truth even if a user closes the tab between paying and the
// client-side save completing.
const crypto = require('crypto');
const { repo, getReadyDb, readRawBody, sendServerError } = require('../_lib');

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
    // Signature is computed over the exact bytes Paystack sent — see
    // readRawBody in api/_lib.js for why the stream can't just be re-read.
    const raw = await readRawBody(req);
    const signature = req.headers['x-paystack-signature'];
    const expected = crypto.createHmac('sha512', secret).update(raw, 'utf8').digest('hex');
    if (!signature || signature !== expected) {
      console.error('POST /api/paystack/webhook: signature rejected', {
        hasSignature: !!signature,
        bodyLength: raw.length,
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(raw);

    if (event.event === 'charge.success' && event.data) {
      const db = await getReadyDb();
      await repo.recordWebhookPayment(db, event.data);
    }

    // Always 200 so Paystack doesn't retry events we've already handled.
    return res.status(200).json({ received: true });
  } catch (err) {
    // Non-2xx asks Paystack to retry, which is what we want when the database
    // was unreachable — the charge is real and must not be dropped.
    return sendServerError(res, err, 'POST /api/paystack/webhook');
  }
};

// Set AFTER the handler assignment: `module.exports = handler` replaces the
// exports object, so a `module.exports.config` written above it is discarded.
module.exports.config = { api: { bodyParser: false } };
