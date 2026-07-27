import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Flat directory, one entry per member.
//
// Deliberately no contact column: this PDF gets downloaded, emailed around,
// and printed, so it carries what identifies a member professionally (name,
// membership number, profession/business, skills) and not their personal
// email address or phone number. Contact details stay behind the admin
// dashboard and the logged-in member directory.
const pdfStyles = StyleSheet.create({
  page: { padding: 30, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
  title: { fontSize: 22, textAlign: 'center', marginBottom: 4, color: '#1a1a2e', fontWeight: 'bold' },
  subtitle: { fontSize: 11, textAlign: 'center', marginBottom: 16, color: '#666' },
  headerRow: {
    flexDirection: 'row', backgroundColor: '#0f3460', paddingVertical: 6,
    paddingHorizontal: 6, marginBottom: 2,
  },
  headerCell: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  row: {
    flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: '#e0e0e0', borderBottomStyle: 'solid',
  },
  cName: { width: '26%', fontSize: 9 },
  cId: { width: '20%', fontSize: 8, color: '#444' },
  cWork: { width: '30%', fontSize: 9 },
  cSkills: { width: '24%', fontSize: 8, color: '#444' },
  footer: { fontSize: 9, textAlign: 'center', marginTop: 16, color: '#999' },
});

function AdminDirectoryPdf({ data }) {
  const sorted = [...data].sort((a, b) =>
    (a.full_name || '').localeCompare(b.full_name || ''));
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>Zentriva Business & Professional Directory</Text>
        <Text style={pdfStyles.subtitle}>
          Generated {new Date().toLocaleDateString()} · {sorted.length} members
        </Text>
        <View style={pdfStyles.headerRow}>
          <Text style={[pdfStyles.headerCell, { width: '26%' }]}>Name</Text>
          <Text style={[pdfStyles.headerCell, { width: '20%' }]}>Member ID</Text>
          <Text style={[pdfStyles.headerCell, { width: '30%' }]}>Profession / Business</Text>
          <Text style={[pdfStyles.headerCell, { width: '24%' }]}>Skills</Text>
        </View>
        {sorted.map((m, i) => (
          <View key={i} style={pdfStyles.row} wrap={false}>
            <Text style={pdfStyles.cName}>{m.full_name}</Text>
            <Text style={pdfStyles.cId}>{m.membership_id || '—'}</Text>
            <Text style={pdfStyles.cWork}>
              {[m.profession, m.business_name].filter(Boolean).join(' · ') || 'N/A'}
            </Text>
            <Text style={pdfStyles.cSkills}>{(m.skills || []).join(', ')}</Text>
          </View>
        ))}
        <Text style={pdfStyles.footer}>Total Members: {sorted.length}</Text>
      </Page>
    </Document>
  );
}

export default AdminDirectoryPdf;
