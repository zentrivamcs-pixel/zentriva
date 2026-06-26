import React, { useState, useEffect, useMemo } from 'react';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

/* ============================================================
   Analytics helpers (each member counted once)
   ============================================================ */

// Tally a scalar field (e.g. profession) -> sorted [ [label, count], ... ]
const tallyScalar = (members, field) => {
  const counts = {};
  members.forEach((m) => {
    const v = m[field];
    if (v) counts[v] = (counts[v] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
};

// Tally an array field (e.g. skills) -> sorted [ [label, count], ... ]
const tallyArray = (members, field) => {
  const counts = {};
  members.forEach((m) => {
    (m[field] || []).forEach((v) => {
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
};

const countWhere = (members, field, value) =>
  members.filter((m) => m[field] === value).length;

// Build one searchable string from a member's main fields.
const searchableText = (member) => [
  member.full_name, member.email, member.phone_number, member.whatsapp_number,
  member.profession, member.business_name, member.business_type, member.company_name,
  member.job_title, member.business_location,
  ...(member.skills || []), ...(member.offer_category || [])
].filter(Boolean).join(' ').toLowerCase();

/* ============================================================
   Small presentational components
   ============================================================ */

const StatTile = ({ label, value, accent }) => (
  <div className="stat-tile">
    <p className="stat-tile-value" style={accent ? { color: accent } : undefined}>{value}</p>
    <p className="stat-tile-label">{label}</p>
  </div>
);

// Horizontal bar chart from [ [label, count], ... ]
const BarChart = ({ title, data, limit = 10, color = '#0f3460' }) => {
  const rows = data.slice(0, limit);
  const max = rows.length ? rows[0][1] : 1;
  return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      {rows.length === 0 ? (
        <p className="chart-empty">No data yet</p>
      ) : (
        <div className="bar-list">
          {rows.map(([label, count]) => (
            <div className="bar-row" key={label}>
              <span className="bar-label" title={label}>{label}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(count / max) * 100}%`, background: color }}
                />
              </div>
              <span className="bar-count">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ============================================================
   PDF — flat directory, one entry per member
   ============================================================ */

const pdfStyles = StyleSheet.create({
  page: { padding: 30, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
  title: { fontSize: 22, textAlign: 'center', marginBottom: 4, color: '#1a1a2e', fontWeight: 'bold' },
  subtitle: { fontSize: 11, textAlign: 'center', marginBottom: 16, color: '#666' },
  headerRow: {
    flexDirection: 'row', backgroundColor: '#0f3460', paddingVertical: 6,
    paddingHorizontal: 6, marginBottom: 2
  },
  headerCell: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  row: {
    flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: '#e0e0e0', borderBottomStyle: 'solid'
  },
  cName: { width: '22%', fontSize: 9 },
  cWork: { width: '28%', fontSize: 9 },
  cContact: { width: '28%', fontSize: 9 },
  cSkills: { width: '22%', fontSize: 8, color: '#444' },
  footer: { fontSize: 9, textAlign: 'center', marginTop: 16, color: '#999' }
});

const DirectoryPDF = ({ data }) => {
  const sorted = [...data].sort((a, b) =>
    (a.full_name || '').localeCompare(b.full_name || ''));
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>Church Business & Professional Directory</Text>
        <Text style={pdfStyles.subtitle}>
          Generated {new Date().toLocaleDateString()} · {sorted.length} members
        </Text>
        <View style={pdfStyles.headerRow}>
          <Text style={[pdfStyles.headerCell, { width: '22%' }]}>Name</Text>
          <Text style={[pdfStyles.headerCell, { width: '28%' }]}>Profession / Business</Text>
          <Text style={[pdfStyles.headerCell, { width: '28%' }]}>Contact</Text>
          <Text style={[pdfStyles.headerCell, { width: '22%' }]}>Skills</Text>
        </View>
        {sorted.map((m, i) => (
          <View key={i} style={pdfStyles.row} wrap={false}>
            <Text style={pdfStyles.cName}>{m.full_name}</Text>
            <Text style={pdfStyles.cWork}>
              {[m.profession, m.business_name].filter(Boolean).join(' · ') || 'N/A'}
            </Text>
            <Text style={pdfStyles.cContact}>{[m.phone_number, m.email].filter(Boolean).join('\n')}</Text>
            <Text style={pdfStyles.cSkills}>{(m.skills || []).join(', ')}</Text>
          </View>
        ))}
        <Text style={pdfStyles.footer}>Total Members: {sorted.length}</Text>
      </Page>
    </Document>
  );
};

/* ============================================================
   Edit modal field config
   ============================================================ */

const EDIT_FIELDS = [
  { name: 'full_name', label: 'Full Name', type: 'text' },
  { name: 'gender', label: 'Gender', type: 'text' },
  { name: 'date_of_birth', label: 'Date of Birth', type: 'date' },
  { name: 'phone_number', label: 'Phone Number', type: 'text' },
  { name: 'whatsapp_number', label: 'WhatsApp Number', type: 'text' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'profession', label: 'Profession', type: 'text' },
  { name: 'company_name', label: 'Company', type: 'text' },
  { name: 'job_title', label: 'Job Title', type: 'text' },
  { name: 'owns_business', label: 'Owns Business (Yes/No)', type: 'text' },
  { name: 'business_name', label: 'Business Name', type: 'text' },
  { name: 'business_type', label: 'Business Type', type: 'text' },
  { name: 'business_location', label: 'Business Location', type: 'text' },
  { name: 'business_phone', label: 'Business Phone', type: 'text' },
  { name: 'years_in_business', label: 'Years in Business', type: 'text' },
  { name: 'skills', label: 'Skills (comma-separated)', type: 'array' },
  { name: 'offer_category', label: 'Offer Categories (comma-separated)', type: 'array' },
  { name: 'additional_comments', label: 'Additional Comments', type: 'textarea' }
];

// Sections used to render the read-only detail view.
const DETAIL_SECTIONS = [
  {
    title: 'Personal', rows: [
      ['Full Name', 'full_name'], ['Gender', 'gender'], ['Date of Birth', 'date_of_birth'],
      ['Phone', 'phone_number'], ['WhatsApp', 'whatsapp_number'], ['Email', 'email']
    ]
  },
  {
    title: 'Employment', rows: [
      ['Status', 'employment_status'], ['Profession', 'profession'], ['Company', 'company_name'],
      ['Job Title', 'job_title'], ['Description', 'work_description']
    ]
  },
  {
    title: 'Business', rows: [
      ['Owns Business', 'owns_business'], ['Business Name', 'business_name'], ['Type', 'business_type'],
      ['Products/Services', 'products_services'], ['Location', 'business_location'],
      ['Business Phone', 'business_phone'], ['Social/Website', 'social_media'],
      ['Years in Business', 'years_in_business']
    ]
  },
  {
    title: 'Skills & Needs', rows: [
      ['Skills', 'skills'], ['Other Skills', 'other_skills'],
      ['Services Needed', 'services_needed'], ['Other Services', 'other_services_needed']
    ]
  },
  {
    title: 'Collaboration', rows: [
      ['Offers Discounts', 'offer_discounts'], ['Discount Details', 'discount_details'],
      ['Open to Partnerships', 'open_to_partnerships'], ['Willing to Mentor', 'willing_to_mentor'],
      ['Available to Speak', 'available_to_speak'], ['Employs Staff', 'employs_staff']
    ]
  },
  {
    title: 'Church Network', rows: [
      ['Offer Categories', 'offer_category'], ['Other Category', 'other_category'],
      ['Consent', 'consent'], ['Additional Comments', 'additional_comments']
    ]
  }
];

const formatValue = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
};

/* ============================================================
   Main Dashboard
   ============================================================ */

function AdminDashboard() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  // Members tab filters
  const [search, setSearch] = useState('');
  const [filterSkill, setFilterSkill] = useState('');
  const [filterProfession, setFilterProfession] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterGender, setFilterGender] = useState('');

  // Modals
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);

  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/members');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
      alert('Error loading data from database');
    } finally {
      setLoading(false);
    }
  };

  /* ----- Analytics (memoized, each member once) ----- */
  const analytics = useMemo(() => ({
    total: members.length,
    gender: tallyScalar(members, 'gender'),
    skills: tallyArray(members, 'skills'),
    professions: tallyScalar(members, 'profession'),
    categories: tallyArray(members, 'offer_category'),
    employment: tallyArray(members, 'employment_status'),
    servicesNeeded: tallyArray(members, 'services_needed'),
    businessOwners: countWhere(members, 'owns_business', 'Yes'),
    mentors: countWhere(members, 'willing_to_mentor', 'Yes'),
    speakers: countWhere(members, 'available_to_speak', 'Yes'),
    partnerships: countWhere(members, 'open_to_partnerships', 'Yes'),
    discounts: countWhere(members, 'offer_discounts', 'Yes'),
    employers: countWhere(members, 'employs_staff', 'Yes')
  }), [members]);

  const maleCount = analytics.gender.find(([g]) => g === 'Male')?.[1] || 0;
  const femaleCount = analytics.gender.find(([g]) => g === 'Female')?.[1] || 0;
  const genderTotal = maleCount + femaleCount || 1;
  const malePct = Math.round((maleCount / genderTotal) * 100);

  /* ----- Filter options ----- */
  const allSkills = useMemo(() => analytics.skills.map(([s]) => s), [analytics.skills]);
  const allProfessions = useMemo(() => analytics.professions.map(([p]) => p), [analytics.professions]);
  const allCategories = useMemo(() => analytics.categories.map(([c]) => c), [analytics.categories]);

  /* ----- Filtered members (each appears once) ----- */
  const term = search.trim().toLowerCase();
  const filteredMembers = useMemo(() => members.filter((m) => {
    if (term && !searchableText(m).includes(term)) return false;
    if (filterSkill && !(m.skills || []).includes(filterSkill)) return false;
    if (filterProfession && m.profession !== filterProfession) return false;
    if (filterCategory && !(m.offer_category || []).includes(filterCategory)) return false;
    if (filterGender && m.gender !== filterGender) return false;
    return true;
  }), [members, term, filterSkill, filterProfession, filterCategory, filterGender]);

  const clearFilters = () => {
    setSearch(''); setFilterSkill(''); setFilterProfession('');
    setFilterCategory(''); setFilterGender('');
  };
  const hasFilters = term || filterSkill || filterProfession || filterCategory || filterGender;

  /* ----- CRUD ----- */
  const handleDelete = async (member) => {
    if (!window.confirm(`Delete ${member.full_name}? This cannot be undone.`)) return;
    try {
      const response = await fetch(`/api/members/${member.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('Failed to delete member');
    }
  };

  const openEdit = (member) => {
    setEditing(member);
    const form = {};
    EDIT_FIELDS.forEach(({ name, type }) => {
      form[name] = type === 'array' ? (member[name] || []).join(', ') : (member[name] ?? '');
    });
    setEditForm(form);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...editing };
      EDIT_FIELDS.forEach(({ name, type }) => {
        payload[name] = type === 'array'
          ? editForm[name].split(',').map((s) => s.trim()).filter(Boolean)
          : editForm[name];
      });
      const response = await fetch(`/api/members/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const updated = await response.json();
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setEditing(null);
    } catch (error) {
      console.error('Error updating member:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>⛪ Admin Dashboard</h1>
          <p className="subtitle">Loading members…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>⛪ Admin Dashboard</h1>
        <p className="subtitle">Business &amp; Professional Directory</p>
      </div>

      {/* Tabs */}
      <div className="dash-tabs">
        <button
          className={`dash-tab ${tab === 'overview' ? 'active' : ''}`}
          onClick={() => setTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`dash-tab ${tab === 'members' ? 'active' : ''}`}
          onClick={() => setTab('members')}
        >
          👥 Members ({members.length})
        </button>
      </div>

      {/* ---------------- OVERVIEW ---------------- */}
      {tab === 'overview' && (
        <div className="overview">
          <div className="stat-tiles">
            <StatTile label="Total Members" value={analytics.total} accent="#0f3460" />
            <StatTile label="Business Owners" value={analytics.businessOwners} accent="#f39c12" />
            <StatTile label="Willing to Mentor" value={analytics.mentors} accent="#27ae60" />
            <StatTile label="Available to Speak" value={analytics.speakers} accent="#8e44ad" />
            <StatTile label="Open to Partnership" value={analytics.partnerships} accent="#2980b9" />
            <StatTile label="Offer Discounts" value={analytics.discounts} accent="#e67e22" />
          </div>

          <div className="analytics-grid">
            {/* Gender donut */}
            <div className="chart-card">
              <h3 className="chart-title">Gender Split</h3>
              {genderTotal === 0 ? (
                <p className="chart-empty">No data yet</p>
              ) : (
                <div className="donut-wrap">
                  <div
                    className="donut"
                    style={{
                      background: `conic-gradient(#0f3460 0 ${malePct}%, #f39c12 ${malePct}% 100%)`
                    }}
                  >
                    <div className="donut-hole">
                      <span>{analytics.total}</span>
                      <small>members</small>
                    </div>
                  </div>
                  <div className="donut-legend">
                    <div><span className="dot" style={{ background: '#0f3460' }} /> Male — {maleCount} ({malePct}%)</div>
                    <div><span className="dot" style={{ background: '#f39c12' }} /> Female — {femaleCount} ({100 - malePct}%)</div>
                  </div>
                </div>
              )}
            </div>

            <BarChart title="Top Skills" data={analytics.skills} color="#0f3460" />
            <BarChart title="Top Professions" data={analytics.professions} color="#2980b9" />
            <BarChart title="Offer Categories" data={analytics.categories} color="#f39c12" />
            <BarChart title="Employment Status" data={analytics.employment} color="#27ae60" />
            <BarChart title="Most Needed Services" data={analytics.servicesNeeded} color="#8e44ad" />
          </div>
        </div>
      )}

      {/* ---------------- MEMBERS ---------------- */}
      {tab === 'members' && (
        <div className="members">
          <div className="toolbar">
            <input
              type="text"
              className="toolbar-search"
              placeholder="Search name, email, profession, business…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="filter-select" value={filterSkill} onChange={(e) => setFilterSkill(e.target.value)}>
              <option value="">All Skills</option>
              {allSkills.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="filter-select" value={filterProfession} onChange={(e) => setFilterProfession(e.target.value)}>
              <option value="">All Professions</option>
              {allProfessions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="filter-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="filter-select" value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            {hasFilters && (
              <button className="card-btn clear-btn" onClick={clearFilters}>Clear</button>
            )}
            <div className="toolbar-spacer" />
            <PDFDownloadLink
              document={<DirectoryPDF data={filteredMembers} />}
              fileName="church-directory.pdf"
            >
              {({ loading }) => (
                <button className="pdf-button" disabled={loading}>
                  {loading ? 'Generating…' : '📄 Export PDF'}
                </button>
              )}
            </PDFDownloadLink>
          </div>

          <p className="result-count">
            Showing {filteredMembers.length} of {members.length} members
          </p>

          <div className="table-wrap">
            <table className="members-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Profession / Business</th>
                  <th>Contact</th>
                  <th>Skills</th>
                  <th>Categories</th>
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="table-empty">
                      {hasFilters ? 'No members match your filters.' : 'No members registered yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => (
                    <tr key={m.id}>
                      <td className="cell-name">{m.full_name}</td>
                      <td>{m.gender || '—'}</td>
                      <td>
                        <div>{m.profession || '—'}</div>
                        {m.business_name && <div className="cell-sub">{m.business_name}</div>}
                      </td>
                      <td>
                        <div>{m.phone_number || '—'}</div>
                        {m.email && <div className="cell-sub">{m.email}</div>}
                      </td>
                      <td>
                        <div className="tag-cell">
                          {(m.skills || []).slice(0, 3).map((s) => (
                            <span className="tag" key={s}>{s}</span>
                          ))}
                          {(m.skills || []).length > 3 && (
                            <span className="tag tag-more">+{m.skills.length - 3}</span>
                          )}
                          {(!m.skills || m.skills.length === 0) && '—'}
                        </div>
                      </td>
                      <td>
                        <div className="tag-cell">
                          {(m.offer_category || []).map((c) => (
                            <span className="tag tag-cat" key={c}>{c}</span>
                          ))}
                          {(!m.offer_category || m.offer_category.length === 0) && '—'}
                        </div>
                      </td>
                      <td className="actions-col">
                        <div className="row-actions">
                          <button className="icon-btn" title="View" onClick={() => setViewing(m)}>👁️</button>
                          <button className="icon-btn" title="Edit" onClick={() => openEdit(m)}>✏️</button>
                          <button className="icon-btn danger" title="Delete" onClick={() => handleDelete(m)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- VIEW MODAL ---------------- */}
      {viewing && (
        <div className="modal-overlay" onClick={() => setViewing(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{viewing.full_name}</h2>
              <button className="modal-close" onClick={() => setViewing(null)}>✕</button>
            </div>
            <div className="detail-body">
              {DETAIL_SECTIONS.map((section) => (
                <div className="detail-section" key={section.title}>
                  <h4>{section.title}</h4>
                  {section.rows.map(([label, key]) => (
                    <div className="detail-row" key={key}>
                      <span className="detail-label">{label}</span>
                      <span className="detail-value">{formatValue(viewing[key])}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="card-btn edit-btn" onClick={() => { const m = viewing; setViewing(null); openEdit(m); }}>
                ✏️ Edit
              </button>
              <button className="card-btn" onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- EDIT MODAL ---------------- */}
      {editing && (
        <div className="modal-overlay" onClick={() => !saving && setEditing(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Member</h2>
              <button className="modal-close" onClick={() => setEditing(null)} disabled={saving}>✕</button>
            </div>
            <form onSubmit={saveEdit} className="modal-form">
              {EDIT_FIELDS.map(({ name, label, type }) => (
                <div className="modal-field" key={name}>
                  <label>{label}</label>
                  {type === 'textarea' ? (
                    <textarea name={name} rows="3" value={editForm[name]} onChange={handleEditChange} />
                  ) : (
                    <input
                      type={type === 'array' ? 'text' : type}
                      name={name}
                      value={editForm[name]}
                      onChange={handleEditChange}
                    />
                  )}
                </div>
              ))}
              <div className="modal-actions">
                <button type="button" className="card-btn" onClick={() => setEditing(null)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="card-btn edit-btn" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
