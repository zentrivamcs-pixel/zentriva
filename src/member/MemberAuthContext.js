import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMemberToken, setMemberToken, clearMemberToken, memberApi, publicApi } from '../shared/api';
import { buildMemberView } from './memberView';

// Real member session state for the portal: loads the logged-in member from
// /api/me on mount (when a token exists) and exposes login/claim/logout.
const MemberAuthContext = createContext(null);

export function MemberAuthProvider({ children }) {
  const [member, setMember] = useState(null);
  // Only show the initial loading screen if there's a token worth checking.
  const [loading, setLoading] = useState(() => !!getMemberToken());

  const refresh = useCallback(async () => {
    if (!getMemberToken()) {
      setMember(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setMember(await memberApi('/api/me'));
    } catch (error) {
      if (error.status === 401) clearMemberToken();
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email, password) => {
    const data = await publicApi('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setMemberToken(data.token);
    setMember(data.member);
  }, []);

  const claim = useCallback(async (email, paymentReference, password) => {
    const data = await publicApi('/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({ email, payment_reference: paymentReference, password }),
    });
    setMemberToken(data.token);
    setMember(data.member);
  }, []);

  const resendVerification = useCallback((email) => (
    publicApi('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  ), []);

  const logout = useCallback(() => {
    clearMemberToken();
    setMember(null);
  }, []);

  const value = useMemo(() => ({
    member,
    view: member ? buildMemberView(member) : null,
    loading,
    login,
    claim,
    resendVerification,
    logout,
    refresh,
    setMember,
  }), [member, loading, login, claim, resendVerification, logout, refresh]);

  return (
    <MemberAuthContext.Provider value={value}>
      {children}
    </MemberAuthContext.Provider>
  );
}

export function useMemberAuth() {
  const ctx = useContext(MemberAuthContext);
  if (!ctx) {
    throw new Error('useMemberAuth must be used within a MemberAuthProvider');
  }
  return ctx;
}
