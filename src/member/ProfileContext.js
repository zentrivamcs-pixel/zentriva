import React, { createContext, useContext, useEffect, useState } from 'react';

// Shares the member's profile photo across the portal (profile editor, the
// membership ID card preview, and the exported badge). Photos are stored in
// this browser's localStorage only — server-side avatar upload (object
// storage + members.avatar_url) is the planned replacement.
const ProfileContext = createContext(null);

const AVATAR_STORAGE_KEY = 'zentriva_profile_avatar';

export function ProfileProvider({ children }) {
  const [avatarSrc, setAvatarSrc] = useState(() => {
    try {
      return localStorage.getItem(AVATAR_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (avatarSrc) {
        localStorage.setItem(AVATAR_STORAGE_KEY, avatarSrc);
      } else {
        localStorage.removeItem(AVATAR_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable (e.g. private browsing) — photo just won't persist.
    }
  }, [avatarSrc]);

  return (
    <ProfileContext.Provider value={{ avatarSrc, setAvatarSrc }}>
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
