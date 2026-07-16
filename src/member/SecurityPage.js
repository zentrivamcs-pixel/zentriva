import React, { useState } from 'react';
import ImagePlaceholder from '../shared/ImagePlaceholder';
import { twoFactorMethods, initialLoginSessions, recoveryEmailMasked } from './securityData';

const MIN_PASSWORD_LENGTH = 12;

function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () =>
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    '-' +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}

function SecurityPage() {
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [sessions, setSessions] = useState(initialLoginSessions);

  const [emailVerifying, setEmailVerifying] = useState(false);

  const handlePasswordField = (field) => (e) => {
    setPasswordForm((prev) => ({ ...prev, [field]: e.target.value }));
    setPasswordSuccess(false);
  };

  const handlePasswordSubmit = (e) => {
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

    setPasswordError('');
    setPasswordSuccess(true);
    setPasswordForm({ current: '', next: '', confirm: '' });
  };

  const handleLogoutOthers = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
  };

  const handleVerifyEmail = () => {
    setEmailVerifying(true);
  };

  const handleDownloadBackupCodes = () => {
    const codes = generateBackupCodes();
    const blob = new Blob(
      [`Zentriva Backup Codes\nGenerated ${new Date().toISOString()}\n\n${codes.join('\n')}\n`],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'zentriva-backup-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <>
      <div className="mb-8">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Security &amp; Privacy</h2>
        <p className="font-body-md text-body-md text-secondary">
          Manage your credentials, authentication methods, and monitor account activity.
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
                  placeholder="••••••••••••"
                  type="password"
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
                    placeholder={`Minimum ${MIN_PASSWORD_LENGTH} chars`}
                    type="password"
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
                    value={passwordForm.confirm}
                    onChange={handlePasswordField('confirm')}
                  />
                </div>
              </div>
            </div>

            {passwordError && (
              <p className="font-label-sm text-label-sm text-error">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="font-label-sm text-label-sm text-on-tertiary-container">
                Password updated successfully.
              </p>
            )}

            <div className="pt-4 flex justify-end">
              <button
                className="px-8 py-3 bg-primary text-on-primary font-bold rounded-lg shadow-md hover:bg-opacity-90 active:scale-95 transition-all"
                type="submit"
              >
                Update Password
              </button>
            </div>
          </form>
        </section>

        {/* 2FA Status */}
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
                ACTIVE
              </span>
            </div>
            <h3 className="font-headline-md text-headline-md mb-2">Two-Factor Auth</h3>
            <p className="font-body-md text-body-md opacity-80 mb-8">
              Your account is currently protected with a secondary authentication layer via
              Authenticator App.
            </p>
            <div className="space-y-4">
              {twoFactorMethods.map((method) => (
                <div
                  key={method.key}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined opacity-60">{method.icon}</span>
                    <span className="font-label-md text-label-md">{method.label}</span>
                  </div>
                  {method.enabled ? (
                    <span className="material-symbols-outlined text-tertiary-fixed">check_circle</span>
                  ) : (
                    <span className="material-symbols-outlined opacity-40">chevron_right</span>
                  )}
                </div>
              ))}
            </div>
            <button className="w-full mt-8 py-3 bg-transparent text-on-primary-container border border-white/20 hover:bg-white/10 transition-colors rounded-lg font-label-md text-label-md">
              Manage Methods
            </button>
          </div>
        </section>

        {/* Login History */}
        <section className="lg:col-span-12 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-outline-variant flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary p-2 bg-surface-container rounded-lg">
                history
              </span>
              <h3 className="font-headline-md text-headline-md">Login History</h3>
            </div>
            <button
              type="button"
              onClick={handleLogoutOthers}
              disabled={otherSessionsCount === 0}
              className="bg-transparent text-primary font-label-md text-label-md hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:no-underline"
            >
              Log out all other sessions
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                <tr>
                  <th className="px-8 py-4">Browser / Device</th>
                  <th className="px-8 py-4">Location</th>
                  <th className="px-8 py-4">IP Address</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-surface-container/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-secondary">{session.icon}</span>
                        <div>
                          <p className="font-label-md text-label-md text-on-surface">{session.device}</p>
                          <p className="font-label-sm text-label-sm text-secondary">{session.sublabel}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 font-body-md text-body-md">{session.location}</td>
                    <td className="px-8 py-5 font-label-sm text-label-sm text-secondary">{session.ip}</td>
                    <td className="px-8 py-5">
                      <span
                        className={`px-2 py-1 text-label-sm font-bold rounded-full ${
                          session.status === 'ACTIVE'
                            ? 'bg-tertiary-container text-on-tertiary-container'
                            : 'bg-surface-container text-secondary'
                        }`}
                      >
                        {session.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-body-md text-body-md">{session.lastActivity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-8 py-4 bg-surface-container-low text-center">
            <button className="bg-transparent font-label-md text-label-md text-secondary hover:text-primary transition-colors flex items-center gap-2 mx-auto">
              View full activity log <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </section>

        {/* Security Advisory */}
        <section className="lg:col-span-12 glass-card rounded-xl p-8 border border-outline-variant flex flex-col md:flex-row items-center gap-8">
          <div className="w-full md:w-1/3 aspect-video rounded-lg overflow-hidden bg-surface-container shadow-inner">
            <ImagePlaceholder
              icon="shield"
              alt="Security advisory illustration"
              shape="rect"
              className="w-full h-full text-[40px]"
            />
          </div>
          <div className="flex-grow">
            <h4 className="font-headline-md text-headline-md mb-4">Security Advisory</h4>
            <p className="font-body-md text-body-md text-secondary mb-6">
              We recommend updating your recovery email every 6 months to ensure you never lose
              access to your premium benefits. Your current recovery email is{' '}
              <span className="text-on-surface font-bold">{recoveryEmailMasked}</span>.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handleVerifyEmail}
                disabled={emailVerifying}
                className="px-6 py-2 bg-primary text-on-primary font-label-md text-label-md rounded-lg active:scale-95 transition-transform disabled:opacity-60"
              >
                {emailVerifying ? 'Verification Sent' : 'Verify Email'}
              </button>
              <button
                onClick={handleDownloadBackupCodes}
                className="bg-transparent px-6 py-2 border border-outline text-on-surface-variant font-label-md text-label-md rounded-lg hover:bg-surface-container transition-colors"
              >
                Download Backup Codes
              </button>
              {emailVerifying && (
                <span className="font-label-sm text-label-sm text-on-tertiary-container">
                  Check your inbox for a confirmation link.
                </span>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default SecurityPage;
