// POST /api/uploads — issues short-lived client tokens for direct-to-Vercel-
// Blob uploads (registration's passport photo, bank-transfer payment proof,
// and a member's own profile photo change). The file itself never passes
// through this function — the browser uploads straight to Blob storage,
// which keeps large images off the 4.5MB serverless request-body limit.
// Requires a Blob store to be linked to the Vercel project (adds
// BLOB_READ_WRITE_TOKEN automatically).
const { handleUpload } = require('@vercel/blob/client');
const { parseBody } = require('./_lib');

const ALLOWED_PREFIXES = ['passports/', 'payment-proofs/'];
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = parseBody(req);
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
          throw new Error('Uploads are only allowed under passports/ or payment-proofs/');
        }
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return res.status(200).json(jsonResponse);
  } catch (err) {
    console.error('POST /api/uploads error:', err);
    return res.status(400).json({ error: err.message || 'Upload token request failed' });
  }
};
