// Static option lists for the registration page.

// The training programmes offered by the "Learn a Skill" module. Mirrored in
// shared/validation.js (TRAINING_SKILLS) — CRA can't import from outside src/,
// so the two are kept in sync by hand, same convention as membershipTiers.js.
// The server rejects anything not on its copy of this list.
export const TRAINING_SKILLS = [
  'Phone Repairs',
  'Computer Repairs',
  'Electronics',
  'Plumbing',
  'Catering',
  'Website Development',
  'Sound Engineering',
  'Graphics Design (Printing Press etc)',
  'Digital Marketing',
  'Photography',
  'Quality Assurance',
  'Welding',
  'Fashion Designing',
  'Driving',
  'Farming and Agro',
  'Interior Decoration',
];

export const SKILL_AGE_MIN = 10;
export const SKILL_AGE_MAX = 100;

// A registration reference is generated client-side and travels with the
// submission, so the member has something to quote before any payment
// provider has issued one of its own. The prefix records how the fee was
// settled: BT- bank transfer, PL- pay later.
export const generateReference = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
