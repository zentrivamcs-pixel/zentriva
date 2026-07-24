import React, { useState } from 'react';
import '../styles/tailwind.css';
import AdminLayout from './AdminLayout';
import Logo from '../shared/Logo';
import { getAdminToken, setAdminToken, clearAdminToken, publicApi } from '../shared/api';

function AdminGate() {
  const [authed, setAuthed] = useState(() => !!getAdminToken());
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setChecking(true);
    setError('');
    try {
      // The password is verified server-side; the client only ever holds a
      // short-lived signed session token.
      const { token } = await publicApi('/api/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setAdminToken(token);
      setAuthed(true);
      setPassword('');
    } catch (err) {
      setError(err.status === 401 ? 'Incorrect password. Please try again.' : err.message);
      setPassword('');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
    clearAdminToken();
    setAuthed(false);
    setPassword('');
  };

  if (!authed) {
    return (
      <div className="bg-primary-container min-h-screen flex items-center justify-center p-margin-mobile">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-surface-container-lowest rounded-xl shadow-lg p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <Logo className="h-10 w-10" />
            <div>
              <h1 className="font-headline-md text-headline-md text-primary">Zentriva CMS</h1>
              <p className="text-label-sm text-on-surface-variant">Admin access required</p>
            </div>
          </div>

          <label className="block text-label-sm text-on-surface-variant mb-1" htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter the admin password"
            autoFocus
            className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:outline-none"
          />

          {error && <p className="text-error text-label-sm mt-2">{error}</p>}

          <button
            type="submit"
            disabled={checking}
            className="w-full mt-6 py-3 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {checking ? 'Checking…' : 'Unlock Dashboard'}
          </button>
        </form>
      </div>
    );
  }

  return <AdminLayout onLogout={handleLogout} />;
}

export default AdminGate;
