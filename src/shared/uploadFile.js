// Uploads an image straight from the browser to Vercel Blob storage (via
// /api/uploads, which only issues a short-lived client token — the file
// itself never passes through our serverless functions). Used for passport/
// ID photos and bank-transfer payment proof, both of which need to be
// retained permanently and retrievable by URL at any time.
import { upload } from '@vercel/blob/client';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB, matches api/uploads.js
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// `prefix` is 'passports' or 'payment-proofs' — must match one of the
// prefixes api/uploads.js allows.
export async function uploadImage(file, prefix) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Please upload a JPEG, PNG, or WebP image.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image must be smaller than 5MB.');
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const pathname = `${prefix}/${Date.now()}-${safeName}`;
  const blob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/uploads',
  });
  return blob.url;
}
