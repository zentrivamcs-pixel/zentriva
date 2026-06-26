import React, { useState } from 'react';
import AdminDashboard from './AdminDashboard';

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
      <div className="admin-login">
        <form className="admin-login-card" onSubmit={handleLogin}>
          <h1>🔒 Admin Access</h1>
          <p className="admin-login-subtitle">
            Enter the password to view the directory dashboard.
          </p>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
          />

          {error && <p className="admin-login-error">{error}</p>}

          <button type="submit">Unlock Dashboard</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-authed">
      <div className="admin-logout-bar">
        <button className="admin-logout-btn" onClick={handleLogout}>
          🔓 Log out
        </button>
      </div>
      <AdminDashboard />
    </div>
  );
}

export default AdminGate;
