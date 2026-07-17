// POST /api/members/:id/:action — admin-only member actions (reset, payment).
// Consolidated into one dynamic route so the two actions share a single
// Vercel serverless function instead of two (Hobby plan caps a deployment
// at 12 functions).
const { repo, getReadyDb, parseBody, requireAdmin } = require('../../_lib');
const { sendPaymentApprovedEmail, sendPaymentRejectedEmail } = require('../../../shared/email');

// Admin stopgap: clears the member's portal password (and invalidates their
// sessions). The member re-activates via the claim flow (email + payment
// reference) or a reset email.
async function reset(req, res, db, id) {
  const member = await repo.clearPassword(db, id);
  if (!member) return res.status(404).json({ error: 'Not found' });
  return res.status(200).json(repo.sanitizeMember(member));
}

// Approves or rejects a pending bank-transfer registration's payment proof.
// Approving unblocks the member's portal login; rejecting leaves it locked.
async function payment(req, res, db, id) {
  const { decision } = parseBody(req);
  if (decision !== 'approve' && decision !== 'reject') {
    return res.status(400).json({ error: 'decision must be "approve" or "reject"' });
  }
  const status = decision === 'approve' ? 'paid' : 'rejected';
  const member = await repo.setPaymentStatus(db, id, status);
  if (!member) return res.status(404).json({ error: 'Not found' });

  if (decision === 'approve') {
    await sendPaymentApprovedEmail(member);
  } else {
    await sendPaymentRejectedEmail(member);
  }
  return res.status(200).json(repo.sanitizeMember(member));
}

const ACTIONS = { reset, payment };

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const handler = ACTIONS[req.query.action];
  if (!handler) return res.status(404).json({ error: 'Not found' });

  try {
    if (!requireAdmin(req, res)) return;
    const db = await getReadyDb();
    return await handler(req, res, db, req.query.id);
  } catch (err) {
    console.error(`POST /api/members/${req.query.id}/${req.query.action} error:`, err);
    return res.status(500).json({ error: 'Server error' });
  }
};
