// /api/members  — GET (list all, admin only), POST (create, payment-gated)
const { repo, getReadyDb, parseBody, verifyPaystackPayment, requireAdmin, auth } = require('../_lib');
const { validateRegistration, passwordError, cleanUrl } = require('../../shared/validation');
const { getTier } = require('../../shared/membershipTiers');
const { sendRegistrationEmail, sendVerificationEmail } = require('../../shared/email');

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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

      // Two ways to pay: a verified Paystack charge (member logs in right
      // away), or a bank transfer with an uploaded proof image (member's
      // account is created but login is gated until an admin reviews and
      // approves the proof from the dashboard).
      const isBankTransfer = body.payment_method === 'bank_transfer';
      let tx;
      let paymentMeta;
      if (isBankTransfer) {
        const proofUrl = cleanUrl(body.payment_proof_url);
        if (!proofUrl) {
          return res.status(400).json({ error: 'A payment proof image is required for bank transfer registrations' });
        }
        // No Paystack transaction to verify — record a pending payment row
        // using the same shape createMember expects from a real Paystack tx.
        tx = {
          reference: value.payment_reference,
          amount: getTier(value.membership_tier).priceNaira * 100,
          currency: 'NGN',
          status: 'pending',
          channel: 'bank_transfer',
          paid_at: null,
        };
        paymentMeta = { method: 'bank_transfer', status: 'pending_review', proofUrl };
      } else {
        tx = await verifyPaystackPayment(value.payment_reference, value.membership_tier);
        if (!tx) {
          return res.status(402).json({ error: 'Payment could not be verified' });
        }
        paymentMeta = { method: 'paystack', status: 'paid', proofUrl: null };
      }

      const db = await getReadyDb();
      // Atomic: member row + membership number + password + payment record.
      const created = await repo.createMember(db, value, tx, passwordHash, paymentMeta);

      // Membership confirmation email — awaited so the serverless function
      // isn't frozen mid-send, but strictly best-effort: a mail failure
      // never fails a paid registration (sendRegistrationEmail never throws).
      await sendRegistrationEmail(created);

      // Payment proves the charge went through, not that this member owns
      // the email address — that's proven separately via this link before
      // login is allowed (see login()'s email_verified gate).
      const verifyToken = auth.randomToken();
      await repo.createEmailVerification(
        db, Number(created.id), auth.sha256(verifyToken),
        new Date(Date.now() + VERIFY_TTL_MS).toISOString()
      );
      await sendVerificationEmail(created, verifyToken);

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
