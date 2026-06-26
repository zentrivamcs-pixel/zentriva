const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Fields stored as JSON-encoded arrays in SQLite.
const ARRAY_FIELDS = ['employment_status', 'skills', 'services_needed', 'offer_category'];

// Columns we accept on insert (everything except id / created_at).
const COLUMNS = [
  'full_name', 'gender', 'date_of_birth', 'phone_number', 'whatsapp_number', 'email',
  'employment_status', 'profession', 'company_name', 'job_title', 'work_description',
  'owns_business', 'business_name', 'business_type', 'products_services', 'business_location',
  'business_phone', 'social_media', 'years_in_business', 'skills', 'other_skills',
  'services_needed', 'other_services_needed', 'offer_discounts', 'discount_details',
  'open_to_partnerships', 'willing_to_mentor', 'available_to_speak', 'employs_staff',
  'offer_category', 'other_category', 'consent', 'additional_comments'
];

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

// POST /api/members — store one submission.
app.post('/api/members', (req, res) => {
  try {
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

    const placeholders = COLUMNS.map(() => '?').join(', ');
    const stmt = db.prepare(
      `INSERT INTO members (${COLUMNS.join(', ')}) VALUES (${placeholders})`
    );
    const info = stmt.run(...values);

    const created = db.prepare('SELECT * FROM members WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(deserialize(created));
  } catch (err) {
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
