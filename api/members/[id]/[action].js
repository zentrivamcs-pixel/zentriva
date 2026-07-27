// POST /api/members/:id/:action — admin-only member actions (reset, payment).
// Consolidated into one dynamic route so the two actions share a single
// Vercel serverless function instead of two (Hobby plan caps a deployment
// at 12 functions).
const { repo, getReadyDb, parseBody, requireAdmin } = require('../../_lib');
const { sendPaymentApprovedEmail, sendPaymentRejectedEmail } = require('../../../shared/email');
const { cleanPaymentUpdate } = require('../../../shared/validation');

// Admin stopgap: clears the member's portal password (and invalidates their
// sessions). The member re-activates via the claim flow (email + payment
// reference) or a reset email.
async function reset(req, res, db, id) {
  const member = await repo.clearPassword(db, id);
  if (!member) return res.status(404).json({ error: 'Not found' });
  return res.status(200).json(repo.sanitizeMember(member));
}

// Two jobs, told apart by the body:
//   { decision: 'approve' | 'reject' }  — the approve/reject buttons: a
//     decision on a pending bank transfer. Approving unblocks the member's
//     portal login; rejecting leaves it locked. Both email the member.
//   { payment_status?, payment_method?, payment_reference? } — an admin
//     correcting the payment details by hand. No email is sent.
async function payment(req, res, db, id) {
  const body = parseBody(req);

  if (body.decision === undefined) {
    const { value, errors } = cleanPaymentUpdate(body);
    if (errors.length > 0) return res.status(400).json({ error: errors.join(', ') });
    if (Object.keys(value).length === 0) {
      return res.status(400).json({ error: 'No payment fields to update' });
    }
    try {
      const updated = await repo.updatePaymentDetails(db, id, value);
      if (!updated) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(repo.sanitizeMember(updated));
    } catch (err) {
      if (err instanceof repo.ConflictError) {
        return res.status(409).json({ error: err.message, code: err.code });
      }
      throw err;
    }
  }

  const { decision } = body;
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
