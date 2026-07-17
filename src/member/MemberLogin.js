import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/tailwind.css';
import Logo from '../shared/Logo';
import { useMemberAuth } from './MemberAuthContext';
import { publicApi } from '../shared/api';

const inputClass =
  'w-full px-3 py-2.5 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:outline-none';
const labelClass = 'block text-label-sm text-on-surface-variant mb-1 mt-4';

// Login / first-time activation gate for the member portal. Activation
// ("claim") verifies identity with the email + Paystack payment reference
// from registration, then sets the member's password.
function MemberLogin() {
  const { login, claim } = useMemberAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'claim' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setNotice('');
    setPassword('');
    setConfirm('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (mode === 'claim') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirm) {
        setError('Password and confirmation do not match.');
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else if (mode === 'claim') {
        await claim(email.trim(), reference.trim(), password);
      } else {
        const data = await publicApi('/api/auth/forgot', {
          method: 'POST',
          body: JSON.stringify({ email: email.trim() }),
        });
        setNotice(data.message || 'If that email is registered, a reset link has been sent.');
      }
    } catch (err) {
      if (mode === 'forgot' && err.status === 503) {
        setError(
          'Password reset by email is not available yet. Contact support, or use "First time? Activate" with your payment reference if your account was reset.'
        );
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-primary-container min-h-screen flex items-center justify-center p-margin-mobile">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="bg-surface-container-lowest rounded-xl shadow-lg p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <Logo className="h-10 w-10" />
            <div>
              <h1 className="font-headline-md text-headline-md text-primary">Member Portal</h1>
              <p className="text-label-sm text-on-surface-variant">
                {mode === 'login' && 'Sign in to your Zentriva account'}
                {mode === 'claim' && 'Activate your member account'}
                {mode === 'forgot' && 'Reset your password'}
              </p>
            </div>
          </div>

          {/* Mode switch */}
          <div className="flex rounded-lg bg-surface-container-low p-1 mb-2">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 rounded-md text-label-md transition-colors ${
                mode === 'login'
                  ? 'bg-surface-container-lowest text-primary font-bold shadow-sm'
                  : 'bg-transparent text-on-surface-variant'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => switchMode('claim')}
              className={`flex-1 py-2 rounded-md text-label-md transition-colors ${
                mode === 'claim'
                  ? 'bg-surface-container-lowest text-primary font-bold shadow-sm'
                  : 'bg-transparent text-on-surface-variant'
              }`}
            >
              First time? Activate
            </button>
          </div>

          {mode === 'claim' && (
            <p className="text-label-sm text-on-surface-variant bg-surface-container-low rounded-lg p-3 mt-2">
              New registrations choose a password on the sign-up form — this
              activation step is for members who registered before portal
              accounts existed. Use the email you registered with and the
              Paystack payment reference from your receipt to set a password.
            </p>
          )}

          {mode === 'forgot' && (
            <p className="text-label-sm text-on-surface-variant bg-surface-container-low rounded-lg p-3 mt-2">
              Enter the email you registered with and we'll send you a link to
              choose a new password. The link is valid for 30 minutes.
            </p>
          )}

          <label className={labelClass} htmlFor="member-email">Email Address</label>
          <input
            id="member-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />

          {mode === 'claim' && (
            <>
              <label className={labelClass} htmlFor="member-reference">Payment Reference</label>
              <input
                id="member-reference"
                type="text"
                required
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. T123456789012345"
                className={inputClass}
              />
            </>
          )}

          {mode !== 'forgot' && (
            <>
              <label className={labelClass} htmlFor="member-password">
                {mode === 'login' ? 'Password' : 'Choose a Password'}
              </label>
              <input
                id="member-password"
                type="password"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'login' ? 'Your password' : 'Minimum 8 characters'}
                className={inputClass}
              />
            </>
          )}

          {mode === 'login' && (
            <p className="text-right mt-2">
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="bg-transparent text-label-sm text-primary hover:underline"
              >
                Forgot password?
              </button>
            </p>
          )}

          {mode === 'claim' && (
            <>
              <label className={labelClass} htmlFor="member-confirm">Confirm Password</label>
              <input
                id="member-confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                className={inputClass}
              />
            </>
          )}

          {error && <p className="text-error text-label-sm mt-3" role="alert">{error}</p>}
          {notice && (
            <p className="text-label-sm mt-3 text-on-tertiary-container bg-tertiary-container/40 rounded-lg p-3" role="status">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full mt-6 py-3 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {busy
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign In'
                : mode === 'claim'
                  ? 'Activate Account'
                  : 'Send Reset Link'}
          </button>

          {mode === 'forgot' && (
            <p className="text-center mt-4">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="bg-transparent text-label-sm text-primary hover:underline"
              >
                ← Back to login
              </button>
            </p>
          )}

          <p className="text-label-sm text-on-surface-variant text-center mt-6">
            Not a member yet?{' '}
            <Link to="/register" className="text-primary font-bold hover:underline">
              Join Zentriva
            </Link>
          </p>
        </form>

        <p className="text-label-sm text-on-primary-container/70 text-center mt-4">
          <Link to="/" className="hover:underline text-on-primary-container">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}

export default MemberLogin;
