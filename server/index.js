const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const express = require('express');
const cors = require('cors');
const db = require('./db');
const { getTier } = require('../shared/membershipTiers');

const app = express();
const PORT = process.env.PORT || 5000;

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

app.use(cors());
app.use(express.json());

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

// Confirms a Paystack transaction actually succeeded, for the right amount
// (the price of the given membership tier) and currency, before we let it
// count as payment for a registration.
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
  return !!(
    result && result.status && tx &&
    tx.status === 'success' &&
    tx.amount === expectedKobo &&
    tx.currency === 'NGN'
  );
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

// GET /api/members — list all submissions, newest first.
app.get('/api/members', (req, res) => {
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

    const paid = await verifyPaystackPayment(body.payment_reference, body.membership_tier);
    if (!paid) {
      return res.status(402).json({ error: 'Payment could not be verified' });
    }

    const values = COLUMNS.map((col) => {
      let val = body[col];
      if (ARRAY_FIELDS.includes(col)) {
        return JSON.stringify(Array.isArray(val) ? val : []);
      }
      if (col === 'consent') {
        return val ? 1 : 0;
      }
      return val === undefined || val === '' ? null : val;
    });

    const placeholders = COLUMNS.map(() => '?').join(', ');
    const stmt = db.prepare(
      `INSERT INTO members (${COLUMNS.join(', ')}) VALUES (${placeholders})`
    );
    const info = stmt.run(...values);

    const created = db.prepare('SELECT * FROM members WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(deserialize(created));
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'This payment has already been used for a registration' });
    }
    console.error('POST /api/members failed:', err);
    res.status(500).json({ error: 'Failed to save member' });
  }
});

// PUT /api/members/:id — update a submission (used by the admin dashboard).
app.put('/api/members/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const body = req.body || {};
    const values = COLUMNS.map((col) => {
      let val = body[col];
      if (ARRAY_FIELDS.includes(col)) {
        return JSON.stringify(Array.isArray(val) ? val : []);
      }
      if (col === 'consent') {
        return val ? 1 : 0;
      }
      return val === undefined || val === '' ? null : val;
    });

    const assignments = COLUMNS.map((col) => `${col} = ?`).join(', ');
    db.prepare(`UPDATE members SET ${assignments} WHERE id = ?`).run(...values, req.params.id);

    const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
    res.json(deserialize(updated));
  } catch (err) {
    console.error('PUT /api/members failed:', err);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// DELETE /api/members/:id — remove a submission (used by the admin dashboard).
app.delete('/api/members/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/members failed:', err);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
