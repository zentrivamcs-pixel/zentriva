import React, { useState } from 'react';
import { useMemberAuth } from './MemberAuthContext';
import { memberApi, setMemberToken } from '../shared/api';

// Matches the API's minimum (see /api/me/password).
const MIN_PASSWORD_LENGTH = 8;

function SecurityPage() {
  const { view } = useMemberAuth();
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePasswordField = (field) => (e) => {
    setPasswordForm((prev) => ({ ...prev, [field]: e.target.value }));
    setPasswordSuccess(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccess(false);

    if (!passwordForm.current) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (passwordForm.next.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSaving(true);
    setPasswordError('');
    try {
      const result = await memberApi('/api/me/password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: passwordForm.current,
          new_password: passwordForm.next,
        }),
      });
      // Changing the password invalidates all sessions; the server returns a
      // fresh token so THIS session stays signed in.
      if (result.token) setMemberToken(result.token);
      setPasswordSuccess(true);
      setPasswordForm({ current: '', next: '', confirm: '' });
    } catch (error) {
      setPasswordError(error.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  const accountFacts = [
    { icon: 'mail', label: 'Login Email', value: view.email },
    { icon: 'badge', label: 'Membership ID', value: view.membershipId },
    { icon: 'schedule', label: 'Session Length', value: 'Signed in for up to 30 days on this device' },
  ];

  return (
    <>
      <div className="mb-8">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Security &amp; Privacy</h2>
        <p className="font-body-md text-body-md text-secondary">
          Manage your password and review how your account is protected.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Change Password */}
        <section className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-8 border border-outline-variant shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary p-2 bg-surface-container rounded-lg">
              key
            </span>
            <h3 className="font-headline-md text-headline-md">Change Password</h3>
          </div>
          <form className="space-y-6" onSubmit={handlePasswordSubmit}>
            <div className="grid grid-cols-1 gap-6">
              <div className="flex flex-col gap-2">
                <label className="font-label-md text-label-md text-on-surface-variant">
                  Current Password
                </label>
                <input
                  className="w-full h-12 px-4 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  placeholder="••••••••"
                  type="password"
                  autoComplete="current-password"
                  value={passwordForm.current}
                  onChange={handlePasswordField('current')}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-on-surface-variant">
                    New Password
                  </label>
                  <input
                    className="w-full h-12 px-4 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder={`Minimum ${MIN_PASSWORD_LENGTH} characters`}
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.next}
                    onChange={handlePasswordField('next')}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-on-surface-variant">
                    Confirm New Password
                  </label>
                  <input
                    className="w-full h-12 px-4 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirm}
                    onChange={handlePasswordField('confirm')}
                  />
                </div>
              </div>
            </div>

            {passwordError && (
              <p className="font-label-sm text-label-sm text-error" role="alert">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="font-label-sm text-label-sm text-on-tertiary-container">
                Password updated successfully.
              </p>
            )}

            <div className="pt-4 flex justify-end">
              <button
                className="px-8 py-3 bg-primary text-on-primary font-bold rounded-lg shadow-md hover:bg-opacity-90 active:scale-95 transition-all disabled:opacity-60"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        </section>

        {/* Account overview */}
        <section className="lg:col-span-5 bg-primary-container text-on-primary-container rounded-xl p-8 shadow-lg relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-surface-container-highest opacity-10 rounded-full" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div className="p-3 bg-white/10 rounded-xl">
                <span
                  className="material-symbols-outlined text-white text-3xl"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  verified_user
                </span>
              </div>
              <span className="px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm rounded-full font-bold">
                {view.active ? 'ACTIVE' : 'RENEWAL DUE'}
              </span>
            </div>
            <h3 className="font-headline-md text-headline-md mb-2">Account Overview</h3>
            <p className="font-body-md text-body-md opacity-80 mb-8">
              Your account is protected with a password only you know. Passwords
              are stored securely and never shown to anyone — including Zentriva staff.
            </p>
            <div className="space-y-4">
              {accountFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10"
                >
                  <span className="material-symbols-outlined opacity-60 flex-shrink-0">{fact.icon}</span>
                  <div className="min-w-0">
                    <p className="font-label-sm text-label-sm opacity-60">{fact.label}</p>
                    <p className="font-label-md text-label-md truncate">{fact.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="font-label-sm text-label-sm opacity-60 mt-8">
              Two-factor authentication is on our roadmap and will appear here
              when available.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

export default SecurityPage;
