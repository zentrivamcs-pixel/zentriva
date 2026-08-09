// Downloads the (filtered) member list as a spreadsheet, Member ID first.
//
// The directory PDF is the shareable, print-friendly view and deliberately
// omits personal contact details; this export is the admin's own working copy
// of the register, so it carries the full record — it stays behind the admin
// dashboard.
import { membershipNumber } from '../member/memberView';

const COLUMNS = [
  ['Member ID', (m) => membershipNumber(m)],
  ['Full Name', (m) => m.full_name],
  ['Email', (m) => m.email],
  ['Phone', (m) => m.phone_number],
  ['WhatsApp', (m) => m.whatsapp_number],
  ['Gender', (m) => m.gender],
  ['Membership Category', (m) => m.membership_category],
  ['Membership Tier', (m) => m.membership_tier],
  ['Profession', (m) => m.profession],
  ['Company', (m) => m.company_name],
  ['Job Title', (m) => m.job_title],
  ['Business Name', (m) => m.business_name],
  ['Business Location', (m) => m.business_location],
  ['Skills', (m) => m.skills],
  ['Offer Categories', (m) => m.offer_category],
  ['Payment Status', (m) => m.payment_status],
  ['Payment Method', (m) => m.payment_method],
  ['Payment Reference', (m) => m.payment_reference],
  ['Portal Account', (m) => (m.has_password ? 'Activated' : 'Not activated')],
  ['Registered', (m) => m.created_at],
];

// Quotes every field rather than only the ones that need it: names carry
// commas, business descriptions carry quotes and newlines, and a value that
// starts with =, +, - or @ is run as a formula by Excel if it lands in a bare
// cell — the leading apostrophe keeps those as text.
function csvCell(value) {
  const raw = Array.isArray(value) ? value.join(', ') : value;
  let text = raw === null || raw === undefined ? '' : String(raw);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildMembersCsv(members) {
  const rows = [COLUMNS.map(([label]) => csvCell(label)).join(',')];
  for (const member of members) {
    rows.push(COLUMNS.map(([, read]) => csvCell(read(member))).join(','));
  }
  return rows.join('\r\n');
}

export function exportMembersCsv(members) {
  // The BOM makes Excel read the file as UTF-8; without it, accented names
  // and the naira sign come out mangled.
  const blob = new Blob([`﻿${buildMembersCsv(members)}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `zentriva-members-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
