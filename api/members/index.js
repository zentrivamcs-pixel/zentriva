// /api/members  — GET (list all, admin only), POST (create, payment-gated)
const { repo, getReadyDb, parseBody, verifyPaystackPayment, requireAdmin, auth } = require('../_lib');
const { validateRegistration, passwordError } = require('../../shared/validation');
const { sendRegistrationEmail } = require('../../shared/email');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      const db = await getReadyDb();
      return res.status(200).json(await repo.listMembers(db));
    }

    if (req.method === 'POST') {
      const body = parseBody(req);

      // Everything written to the database goes through the validation
      // layer: trimmed, length-capped, enum-checked, unknown fields dropped.
      const { value, errors } = validateRegistration(body);
      if (errors.length > 0) {
        return res.status(400).json({ error: `Invalid registration: ${errors.join('; ')}` });
      }

      // The portal password is set during registration. It is hashed here
      // and never stored or logged in plaintext. Optional server-side so a
      // paid registration from an outdated client is never rejected after
      // the charge — those members activate later via the claim flow.
      let passwordHash = null;
      if (body.password !== undefined && body.password !== '') {
        const pwErr = passwordError(body.password);
        if (pwErr) return res.status(400).json({ error: pwErr });
        passwordHash = auth.hashPassword(String(body.password));
      }

      const tx = await verifyPaystackPayment(value.payment_reference, value.membership_tier);
      if (!tx) {
        return res.status(402).json({ error: 'Payment could not be verified' });
      }

      const db = await getReadyDb();
      // Atomic: member row + membership number + password + payment record.
      const created = await repo.createMember(db, value, tx, passwordHash);

      // Membership confirmation email — awaited so the serverless function
      // isn't frozen mid-send, but strictly best-effort: a mail failure
      // never fails a paid registration (sendRegistrationEmail never throws).
      await sendRegistrationEmail(created);

      return res.status(201).json(repo.sanitizeMember(created));
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof repo.ConflictError) {
      return res.status(409).json({ error: err.message, code: err.code });
    }
    console.error('GET/POST /api/members error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
