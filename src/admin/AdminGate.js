import React, { useState } from 'react';
import '../styles/tailwind.css';
import AdminLayout from './AdminLayout';
import Logo from '../shared/Logo';

const STORAGE_KEY = 'ctca_admin_authed';
const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD;

function AdminGate() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) === 'true'
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();

    if (!ADMIN_PASSWORD) {
      setError('Admin password is not configured. Set REACT_APP_ADMIN_PASSWORD.');
      return;
    }

    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, 'true');
      setAuthed(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
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
            className="w-full mt-6 py-3 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity"
          >
            Unlock Dashboard
          </button>
        </form>
      </div>
    );
  }

  return <AdminLayout onLogout={handleLogout} />;
}

export default AdminGate;
