import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import '../styles/tailwind.css';
import Logo from '../shared/Logo';
import { publicApi } from '../shared/api';

// Landing page for the verification email link (/member/verify?token=…).
// Public — it sits outside the authenticated member layout, so (like
// ResetPasswordPage) it calls the API directly rather than via
// MemberAuthContext, which only exists inside MemberLayout.
function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState(token ? 'checking' : 'missing'); // checking | done | error | missing
  const [error, setError] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    publicApi('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then(() => setStatus('done'))
      .catch((err) => {
        setError(err.message || 'Something went wrong. Please try again.');
        setStatus('error');
      });
  }, [token]);

  return (
    <div className="bg-primary-container min-h-screen flex items-center justify-center p-margin-mobile">
      <div className="w-full max-w-md">
        <div className="bg-surface-container-lowest rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Logo className="h-10 w-10" />
            <div>
              <h1 className="font-headline-md text-headline-md text-primary">Verify Email</h1>
              <p className="text-label-sm text-on-surface-variant">Confirm your Zentriva account</p>
            </div>
          </div>

          {status === 'checking' && (
            <p className="font-body-md text-body-md text-on-surface text-center py-4">Verifying your email…</p>
          )}

          {status === 'done' && (
            <div className="text-center py-4">
              <span className="material-symbols-outlined text-primary text-[40px] mb-3 block">
                check_circle
              </span>
              <p className="font-body-md text-body-md text-on-surface mb-6">
                Your email address is verified. You can now log in to the member portal.
              </p>
              <Link
                to="/member"
                className="inline-block px-6 py-3 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity no-underline"
              >
                Go to Login
              </Link>
            </div>
          )}

          {(status === 'error' || status === 'missing') && (
            <div className="text-center py-4">
              <span className="material-symbols-outlined text-error text-[40px] mb-3 block">
                link_off
              </span>
              <p className="font-body-md text-body-md text-on-surface mb-6">
                {status === 'missing'
                  ? 'This verification link is missing its token. Open the link from your email again, or request a new one from the login page.'
                  : error}
              </p>
              <Link
                to="/member"
                className="inline-block px-6 py-3 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity no-underline"
              >
                Back to Login
              </Link>
            </div>
          )}
        </div>

        <p className="text-label-sm text-center mt-4">
          <Link to="/" className="hover:underline text-on-primary-container">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
