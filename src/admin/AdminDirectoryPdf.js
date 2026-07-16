import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Flat directory, one entry per member.
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
  cName: { width: '22%', fontSize: 9 },
  cWork: { width: '28%', fontSize: 9 },
  cContact: { width: '28%', fontSize: 9 },
  cSkills: { width: '22%', fontSize: 8, color: '#444' },
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
}

export default AdminDirectoryPdf;
