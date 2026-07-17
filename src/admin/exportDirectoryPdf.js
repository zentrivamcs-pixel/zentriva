// Builds and downloads the directory PDF on demand. @react-pdf/renderer is
// a very large library, so it's loaded with a dynamic import the first time
// an admin actually clicks Export — it never ships in the main bundle.
export async function exportDirectoryPdf(members) {
  const [{ pdf }, { default: AdminDirectoryPdf }, React] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./AdminDirectoryPdf'),
    import('react'),
  ]);

  const blob = await pdf(React.createElement(AdminDirectoryPdf, { data: members })).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'zentriva-directory.pdf';
  link.click();
  URL.revokeObjectURL(url);
}
