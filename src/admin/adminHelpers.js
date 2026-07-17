// Shared analytics/formatting helpers for the admin dashboard pages.

// Fields stored as arrays — a filter on one of these must check membership
// (.includes) rather than equality.
export const ARRAY_FIELDS = ['employment_status', 'skills', 'services_needed', 'offer_category'];

// Human-readable names for the fields the Dashboard's cards/charts can link
// into, used for the "Filtering by" chip on the Members page.
export const FIELD_LABELS = {
  gender: 'Gender',
  membership_category: 'Membership Category',
  membership_tier: 'Membership Tier',
  owns_business: 'Owns a Business',
  skills: 'Skill',
  profession: 'Profession',
  offer_category: 'Offer Category',
  employment_status: 'Employment Status',
  services_needed: 'Service Needed',
  willing_to_mentor: 'Willing to Mentor',
  available_to_speak: 'Available to Speak',
  open_to_partnerships: 'Open to Partnerships',
  offer_discounts: 'Offers Discounts',
  employs_staff: 'Employs Staff',
};

// Every Dashboard card/chart that represents a slice of the membership
// links here — the Members page filters its table down to exactly the
// members that make up that number.
export const buildMembersFilterUrl = (field, value) =>
  `/admin/members?${new URLSearchParams({ field, value }).toString()}`;

// Tally a scalar field (e.g. profession) -> sorted [ [label, count], ... ]
export const tallyScalar = (members, field) => {
  const counts = {};
  members.forEach((m) => {
    const v = m[field];
    if (v) counts[v] = (counts[v] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
};

// Tally an array field (e.g. skills) -> sorted [ [label, count], ... ]
export const tallyArray = (members, field) => {
  const counts = {};
  members.forEach((m) => {
    (m[field] || []).forEach((v) => {
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
};

export const countWhere = (members, field, value) =>
  members.filter((m) => m[field] === value).length;

// Build one searchable string from a member's main fields.
export const searchableText = (member) => [
  member.full_name, member.email, member.phone_number, member.whatsapp_number,
  member.profession, member.business_name, member.business_type, member.company_name,
  member.job_title, member.business_location, member.membership_tier, member.membership_category,
  ...(member.skills || []), ...(member.offer_category || [])
].filter(Boolean).join(' ').toLowerCase();

// New registrations per month for the last `monthsBack` months (oldest
// first), keyed by a short month label — powers the Dashboard's growth
// chart from real signup dates instead of invented figures.
export const monthlySignups = (members, monthsBack = 6) => {
  const now = new Date();
  const buckets = [];
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en-US', { month: 'short' }), count: 0 });
  }
  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
  members.forEach((m) => {
    if (!m.created_at) return;
    const d = new Date(m.created_at);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (byKey[key]) byKey[key].count += 1;
  });
  return buckets;
};

export const formatValue = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
};

export const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const EDIT_FIELDS = [
  { name: 'full_name', label: 'Full Name', type: 'text' },
  { name: 'membership_tier', label: 'Membership Tier', type: 'text' },
  { name: 'membership_category', label: 'Membership Category', type: 'text' },
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
  { name: 'additional_comments', label: 'Additional Comments', type: 'textarea' },
];

// Sections used to render the read-only detail view.
export const DETAIL_SECTIONS = [
  {
    title: 'Personal', rows: [
      ['Full Name', 'full_name'], ['Membership Tier', 'membership_tier'],
      ['Membership Category', 'membership_category'], ['Gender', 'gender'],
      ['Date of Birth', 'date_of_birth'], ['Phone', 'phone_number'], ['WhatsApp', 'whatsapp_number'],
      ['Email', 'email'],
    ],
  },
  {
    title: 'Employment', rows: [
      ['Status', 'employment_status'], ['Profession', 'profession'], ['Company', 'company_name'],
      ['Job Title', 'job_title'], ['Description', 'work_description'],
    ],
  },
  {
    title: 'Business', rows: [
      ['Owns Business', 'owns_business'], ['Business Name', 'business_name'], ['Type', 'business_type'],
      ['Products/Services', 'products_services'], ['Location', 'business_location'],
      ['Business Phone', 'business_phone'], ['Social/Website', 'social_media'],
      ['Years in Business', 'years_in_business'],
    ],
  },
  {
    title: 'Skills & Needs', rows: [
      ['Skills', 'skills'], ['Other Skills', 'other_skills'],
      ['Services Needed', 'services_needed'], ['Other Services', 'other_services_needed'],
    ],
  },
  {
    title: 'Collaboration', rows: [
      ['Offers Discounts', 'offer_discounts'], ['Discount Details', 'discount_details'],
      ['Open to Partnerships', 'open_to_partnerships'], ['Willing to Mentor', 'willing_to_mentor'],
      ['Available to Speak', 'available_to_speak'], ['Employs Staff', 'employs_staff'],
    ],
  },
  {
    title: 'Zentriva Network', rows: [
      ['Offer Categories', 'offer_category'], ['Other Category', 'other_category'],
      ['Consent', 'consent'], ['Additional Comments', 'additional_comments'],
    ],
  },
  {
    title: 'Payment', rows: [
      ['Payment Method', 'payment_method'], ['Payment Status', 'payment_status'],
      ['Payment Reference', 'payment_reference'],
    ],
  },
];

// Human-readable label + badge color for a member's payment_status.
export const PAYMENT_STATUS_LABELS = {
  paid: { label: 'Paid', className: 'bg-secondary-container text-on-secondary-container' },
  pending_review: { label: 'Pending Review', className: 'bg-tertiary-container text-on-tertiary-container' },
  rejected: { label: 'Rejected', className: 'bg-error-container text-on-error-container' },
};
