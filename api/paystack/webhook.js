// POST /api/paystack/webhook — Paystack event receiver. Verifies the
// x-paystack-signature HMAC before trusting anything, then records
// charge.success events into the payments table. This makes Paystack the
// source of truth even if a user closes the tab between paying and the
// client-side save completing.
const crypto = require('crypto');
const { getClient, ensureSchema } = require('../_lib');

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
      const tx = event.data;
      const db = getClient();
      await ensureSchema(db);

      // Link to a member if a registration already used this reference.
      const memberResult = await db.execute({
        sql: 'SELECT id FROM members WHERE payment_reference = ?',
        args: [tx.reference]
      });
      const memberId = memberResult.rows[0] ? Number(memberResult.rows[0].id) : null;

      await db.execute({
        sql: `INSERT INTO payments (member_id, reference, amount_kobo, currency, status, channel, description, paid_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(reference) DO UPDATE SET
                status = excluded.status,
                paid_at = excluded.paid_at,
                member_id = COALESCE(payments.member_id, excluded.member_id)`,
        args: [
          memberId, tx.reference, tx.amount, tx.currency, tx.status,
          tx.channel || null,
          (tx.metadata && tx.metadata.membership_tier)
            ? `${tx.metadata.membership_tier} tier payment`
            : 'Paystack payment',
          tx.paid_at || tx.paidAt || null,
        ]
      });
    }

    // Always 200 so Paystack doesn't retry events we've already handled.
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('POST /api/paystack/webhook error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
