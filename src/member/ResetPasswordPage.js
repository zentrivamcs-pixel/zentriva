import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import '../styles/tailwind.css';
import Logo from '../shared/Logo';
import { publicApi } from '../shared/api';

const inputClass =
  'w-full px-3 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:outline-none';
const labelClass = 'block text-label-sm text-on-surface-variant mb-1 mt-4';

// Landing page for the password-reset email link (/member/reset?token=…).
// Public — it sits outside the authenticated member layout.
function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Password and confirmation do not match.');
      return;
    }

    setBusy(true);
    try {
      await publicApi('/api/auth/reset', {
        method: 'POST',
        body: JSON.stringify({ token, new_password: password }),
      });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-primary-container min-h-screen flex items-center justify-center p-margin-mobile">
      <div className="w-full max-w-md">
        <div className="bg-surface-container-lowest rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Logo className="h-10 w-10" />
            <div>
              <h1 className="font-headline-md text-headline-md text-primary">Reset Password</h1>
              <p className="text-label-sm text-on-surface-variant">Choose a new portal password</p>
            </div>
          </div>

          {done ? (
            <div className="text-center py-4">
              <span className="material-symbols-outlined text-primary text-[40px] mb-3 block">
                check_circle
              </span>
              <p className="font-body-md text-body-md text-on-surface mb-6">
                Your password has been updated. You can now log in with your
                new password.
              </p>
              <Link
                to="/member"
                className="inline-block px-6 py-3 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity no-underline"
              >
                Go to Login
              </Link>
            </div>
          ) : !token ? (
            <div className="text-center py-4">
              <span className="material-symbols-outlined text-error text-[40px] mb-3 block">
                link_off
              </span>
              <p className="font-body-md text-body-md text-on-surface mb-6">
                This reset link is missing its token. Open the link from your
                email again, or request a new one from the login page.
              </p>
              <Link
                to="/member"
                className="inline-block px-6 py-3 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity no-underline"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className={labelClass} htmlFor="reset-password">New Password</label>
              <input
                id="reset-password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className={inputClass}
              />

              <label className={labelClass} htmlFor="reset-confirm">Confirm New Password</label>
              <input
                id="reset-confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                className={inputClass}
              />

              {error && <p className="text-error text-label-sm mt-3" role="alert">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="w-full mt-6 py-3 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {busy ? 'Please wait…' : 'Set New Password'}
              </button>
            </form>
          )}
        </div>

        <p className="text-label-sm text-center mt-4">
          <Link to="/" className="hover:underline text-on-primary-container">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
