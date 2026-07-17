const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const db = require('./db');
const { getTier } = require('../shared/membershipTiers');
const auth = require('../shared/authUtils');

const app = express();
const PORT = process.env.PORT || 5000;

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Dev server is only ever called by the CRA dev client.
app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] }));

// Keep the raw body around for Paystack webhook signature verification.
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

// Fields stored as JSON-encoded arrays in SQLite.
const ARRAY_FIELDS = ['employment_status', 'skills', 'services_needed', 'offer_category'];

// Columns we accept on insert (everything except id / created_at).
const COLUMNS = [
  'full_name', 'gender', 'membership_category', 'date_of_birth', 'phone_number', 'whatsapp_number', 'email',
  'employment_status', 'profession', 'company_name', 'job_title', 'work_description',
  'owns_business', 'business_name', 'business_type', 'products_services', 'business_location',
  'business_phone', 'social_media', 'years_in_business', 'skills', 'other_skills',
  'services_needed', 'other_services_needed', 'offer_discounts', 'discount_details',
  'open_to_partnerships', 'willing_to_mentor', 'available_to_speak', 'employs_staff',
  'offer_category', 'other_category', 'consent', 'additional_comments', 'membership_tier',
  'payment_reference'
];

// Profile fields a logged-in member may update about themselves.
const PROFILE_EDITABLE_FIELDS = [
  'phone_number', 'whatsapp_number', 'profession', 'company_name', 'job_title',
  'work_description', 'business_name', 'business_type', 'products_services',
  'business_location', 'business_phone', 'social_media',
];

// Fields exposed to other members in the directory.
const DIRECTORY_FIELDS = [
  'id', 'full_name', 'profession', 'company_name', 'job_title',
  'business_name', 'business_type', 'products_services', 'business_location',
  'business_phone', 'social_media', 'skills', 'offer_category',
  'offer_discounts', 'discount_details', 'email', 'phone_number', 'membership_tier',
];

// Confirms a Paystack transaction actually succeeded, for the right amount
// (the price of the given membership tier) and currency. Returns the
// transaction object, or null.
async function verifyPaystackPayment(reference, membershipTierKey) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured on the server');
  }
  const expectedKobo = getTier(membershipTierKey).priceNaira * 100;
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
  );
  const result = await response.json();
  const tx = result && result.data;
  const ok = !!(
    result && result.status && tx &&
    tx.status === 'success' &&
    tx.amount === expectedKobo &&
    tx.currency === 'NGN'
  );
  return ok ? tx : null;
}

// "ZNTR-1042-EXE-2026" — stable membership number.
function buildMembershipId(id, membershipCategory, createdAt) {
  const year = (createdAt || new Date().toISOString()).slice(0, 4);
  const cat = (membershipCategory || '').startsWith('Executive') ? 'EXE' : 'MBR';
  return `ZNTR-${String(1000 + Number(id))}-${cat}-${year}`;
}

// Turn an outgoing DB row into the shape the frontend expects
// (arrays parsed back, consent as a boolean).
function deserialize(row) {
  const out = { ...row };
  for (const field of ARRAY_FIELDS) {
    try {
      out[field] = row[field] ? JSON.parse(row[field]) : [];
    } catch {
      out[field] = [];
    }
  }
  out.consent = !!row.consent;
  return out;
}

// A member row safe to send to the member it belongs to.
function sanitizeMember(row) {
  const out = deserialize(row);
  delete out.password_hash;
  out.has_password = !!row.password_hash;
  return out;
}

function toDirectoryEntry(row) {
  const full = deserialize(row);
  const out = {};
  for (const field of DIRECTORY_FIELDS) out[field] = full[field] ?? null;
  return out;
}

function toValues(body) {
  return COLUMNS.map((col) => {
    let val = body[col];
    if (ARRAY_FIELDS.includes(col)) {
      return JSON.stringify(Array.isArray(val) ? val : []);
    }
    if (col === 'consent') {
      return val ? 1 : 0;
    }
    return val === undefined || val === '' ? null : val;
  });
}

// --- Auth middleware ---------------------------------------------------------

function requireAdmin(req, res, next) {
  if (auth.isAdmin(req)) return next();
  return res.status(401).json({ error: 'Admin authentication required' });
}

function requireMember(req, res, next) {
  const memberId = auth.getMemberId(req);
  if (!memberId) return res.status(401).json({ error: 'Login required' });
  req.memberId = memberId;
  return next();
}

// --- Admin auth ---------------------------------------------------------------

app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD is not configured on the server' });
  }
  const { password } = req.body || {};
  if (!password || !auth.safeEqual(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  const token = auth.signToken({ role: 'admin', sub: 'admin' }, auth.ADMIN_TOKEN_TTL);
  res.json({ token });
});

// --- Member auth ---------------------------------------------------------------

app.post('/api/auth/claim', (req, res) => {
  try {
    const { email, payment_reference, password } = req.body || {};
    if (!email || !payment_reference || !password) {
      return res.status(400).json({ error: 'Email, payment reference, and password are required' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const member = db.prepare(
      'SELECT * FROM members WHERE lower(email) = lower(?) AND payment_reference = ?'
    ).get(String(email).trim(), String(payment_reference).trim());
    if (!member) {
      return res.status(404).json({ error: 'No registration matches that email and payment reference' });
    }
    if (member.password_hash) {
      return res.status(409).json({ error: 'This account is already claimed — use Login instead' });
    }
    db.prepare('UPDATE members SET password_hash = ? WHERE id = ?')
      .run(auth.hashPassword(String(password)), member.id);
    const token = auth.signToken({ role: 'member', sub: member.id }, auth.MEMBER_TOKEN_TTL);
    res.json({ token, member: sanitizeMember(member) });
  } catch (err) {
    console.error('POST /api/auth/claim failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const member = db.prepare(
      'SELECT * FROM members WHERE lower(email) = lower(?) AND password_hash IS NOT NULL'
    ).get(String(email).trim());
    if (!member || !auth.verifyPassword(String(password), member.password_hash)) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }
    const token = auth.signToken({ role: 'member', sub: member.id }, auth.MEMBER_TOKEN_TTL);
    res.json({ token, member: sanitizeMember(member) });
  } catch (err) {
    console.error('POST /api/auth/login failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Member self-service --------------------------------------------------------

app.get('/api/me', requireMember, (req, res) => {
  try {
    let member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (!member.membership_id) {
      db.prepare('UPDATE members SET membership_id = ? WHERE id = ?')
        .run(buildMembershipId(member.id, member.membership_category, member.created_at), member.id);
      member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.memberId);
    }
    res.json(sanitizeMember(member));
  } catch (err) {
    console.error('GET /api/me failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/me', requireMember, (req, res) => {
  try {
    const body = req.body || {};
    const updates = PROFILE_EDITABLE_FIELDS.filter((f) => body[f] !== undefined);
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No editable fields provided' });
    }
    const assignments = updates.map((f) => `${f} = ?`).join(', ');
    const args = updates.map((f) => (body[f] === '' ? null : body[f]));
    db.prepare(`UPDATE members SET ${assignments} WHERE id = ?`).run(...args, req.memberId);
    const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(req.memberId);
    res.json(sanitizeMember(updated));
  } catch (err) {
    console.error('PUT /api/me failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/me/password', requireMember, (req, res) => {
  try {
    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }
    if (String(new_password).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    const member = db.prepare('SELECT password_hash FROM members WHERE id = ?').get(req.memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (!auth.verifyPassword(String(current_password), member.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    db.prepare('UPDATE members SET password_hash = ? WHERE id = ?')
      .run(auth.hashPassword(String(new_password)), req.memberId);
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/me/password failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/me/payments', requireMember, (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT id, reference, amount_kobo, currency, status, channel, description, paid_at, created_at
       FROM payments WHERE member_id = ?
       ORDER BY datetime(COALESCE(paid_at, created_at)) DESC`
    ).all(req.memberId);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/me/payments failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Member directory ------------------------------------------------------------

app.get('/api/directory', requireMember, (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT * FROM members WHERE consent = 1 ORDER BY full_name COLLATE NOCASE ASC'
    ).all();
    res.json(rows.map(toDirectoryEntry));
  } catch (err) {
    console.error('GET /api/directory failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Admin member CRUD -------------------------------------------------------------

// GET /api/members — list all submissions, newest first. Admin only.
app.get('/api/members', requireAdmin, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM members ORDER BY datetime(created_at) DESC').all();
    res.json(rows.map(deserialize));
  } catch (err) {
    console.error('GET /api/members failed:', err);
    res.status(500).json({ error: 'Failed to load members' });
  }
});

// POST /api/members — store one submission (requires a verified Paystack payment).
app.post('/api/members', async (req, res) => {
  try {
    const body = req.body || {};

    if (!body.payment_reference) {
      return res.status(402).json({ error: 'Payment reference is required' });
    }

    const tx = await verifyPaystackPayment(body.payment_reference, body.membership_tier);
    if (!tx) {
      return res.status(402).json({ error: 'Payment could not be verified' });
    }

    const placeholders = COLUMNS.map(() => '?').join(', ');
    const stmt = db.prepare(
      `INSERT INTO members (${COLUMNS.join(', ')}) VALUES (${placeholders})`
    );
    const info = stmt.run(...toValues(body));
    const newId = info.lastInsertRowid;

    // Assign the human-readable membership number now that the id exists.
    db.prepare('UPDATE members SET membership_id = ? WHERE id = ?')
      .run(buildMembershipId(newId, body.membership_category), newId);

    // Record the verified payment for the member's billing history.
    try {
      db.prepare(
        `INSERT INTO payments (member_id, reference, amount_kobo, currency, status, channel, description, paid_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(reference) DO UPDATE SET member_id = excluded.member_id`
      ).run(
        newId, tx.reference, tx.amount, tx.currency, tx.status,
        tx.channel || null,
        `${body.membership_tier || 'standard'} tier registration`,
        tx.paid_at || tx.paidAt || null
      );
    } catch (payErr) {
      console.error('Failed to record payment history:', payErr);
    }

    const created = db.prepare('SELECT * FROM members WHERE id = ?').get(newId);
    res.status(201).json(deserialize(created));
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'This payment has already been used for a registration' });
    }
    console.error('POST /api/members failed:', err);
    res.status(500).json({ error: 'Failed to save member' });
  }
});

// PUT /api/members/:id — update a submission (admin dashboard).
app.put('/api/members/:id', requireAdmin, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const assignments = COLUMNS.map((col) => `${col} = ?`).join(', ');
    db.prepare(`UPDATE members SET ${assignments} WHERE id = ?`)
      .run(...toValues(req.body || {}), req.params.id);

    const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
    res.json(deserialize(updated));
  } catch (err) {
    console.error('PUT /api/members failed:', err);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// DELETE /api/members/:id — remove a submission (admin dashboard).
app.delete('/api/members/:id', requireAdmin, (req, res) => {
  try {
    const info = db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/members failed:', err);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

// --- Paystack webhook -----------------------------------------------------------

app.post('/api/paystack/webhook', (req, res) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ error: 'PAYSTACK_SECRET_KEY is not configured' });
    }
    const signature = req.headers['x-paystack-signature'];
    const expected = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(req.rawBody || Buffer.from(''))
      .digest('hex');
    if (!signature || signature !== expected) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body || {};
    if (event.event === 'charge.success' && event.data) {
      const tx = event.data;
      const member = db.prepare('SELECT id FROM members WHERE payment_reference = ?').get(tx.reference);
      db.prepare(
        `INSERT INTO payments (member_id, reference, amount_kobo, currency, status, channel, description, paid_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(reference) DO UPDATE SET
           status = excluded.status,
           paid_at = excluded.paid_at,
           member_id = COALESCE(payments.member_id, excluded.member_id)`
      ).run(
        member ? member.id : null, tx.reference, tx.amount, tx.currency, tx.status,
        tx.channel || null,
        (tx.metadata && tx.metadata.membership_tier)
          ? `${tx.metadata.membership_tier} tier payment`
          : 'Paystack payment',
        tx.paid_at || tx.paidAt || null
      );
    }
    res.json({ received: true });
  } catch (err) {
    console.error('POST /api/paystack/webhook failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
