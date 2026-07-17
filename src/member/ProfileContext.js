import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { memberApi } from '../shared/api';
import { uploadImage } from '../shared/uploadFile';
import { useMemberAuth } from './MemberAuthContext';

// Shares the member's profile photo across the portal (profile editor, the
// membership ID card preview, and the exported badge). The photo lives on
// the member record (passport_photo_url, uploaded to Vercel Blob) so it's
// retained permanently and available from any device — not just this browser.
const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const { member, setMember } = useMemberAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const avatarSrc = member?.passport_photo_url || null;

  // Uploads the file to Blob storage, then saves the resulting URL onto the
  // member's own record so it persists across devices and sessions.
  const setAvatarFile = useCallback(async (file) => {
    setError('');
    setUploading(true);
    try {
      const url = await uploadImage(file, 'passports');
      const updated = await memberApi('/api/me', {
        method: 'PUT',
        body: JSON.stringify({ passport_photo_url: url }),
      });
      setMember(updated);
    } catch (err) {
      setError(err.message || 'Failed to update profile photo');
    } finally {
      setUploading(false);
    }
  }, [setMember]);

  const value = useMemo(
    () => ({ avatarSrc, setAvatarFile, uploading, error }),
    [avatarSrc, setAvatarFile, uploading, error]
  );

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return ctx;
}
