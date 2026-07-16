import React, { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './home/HomePage';
import FormPage from './FormPage';
import AdminGate from './AdminGate';
import MemberLayout from './member/MemberLayout';
import Overview from './member/Overview';
import MembershipId from './member/MembershipId';
import ProfileInfo from './member/ProfileInfo';
import SecurityPage from './member/SecurityPage';
import ComingSoon from './member/ComingSoon';
import Logo from './shared/Logo';
import './App.css';

function App() {
  const location = useLocation();
  // The homepage and member portal ship their own header/nav, so the plain
  // public nav bar is only needed on the pages that don't have one.
  const hasOwnNav = location.pathname === '/' || location.pathname.startsWith('/member');

  // React Router doesn't reset scroll position on navigation (it's an SPA).
  // Reset on path changes only, so in-page anchors (e.g. "#benefits") can
  // still smooth-scroll to a section without being fought back to the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="App">
      {!hasOwnNav && (
        <nav className="nav-bar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              <Logo onDark className="h-9 w-9" />
              ZENTRIVA
            </Link>
            <div className="nav-links">
              <Link to="/" className="nav-home-link">
                <span aria-hidden="true">←</span> Back to Home
              </Link>
            </div>
          </div>
        </nav>
      )}

      {/* Routes */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<FormPage />} />
        <Route path="/admin" element={<AdminGate />} />

        <Route path="/member" element={<MemberLayout />}>
          <Route index element={<Overview />} />
          <Route path="id" element={<MembershipId />} />
          <Route path="profile" element={<ProfileInfo />} />
          <Route path="security" element={<SecurityPage />} />
          <Route path="billing" element={<ComingSoon title="Billing" icon="payments" />} />
          <Route path="benefits" element={<ComingSoon title="Benefits" icon="star" />} />
        </Route>

        <Route path="*" element={<HomePage />} />
      </Routes>
    </div>
  );
}

export default App;
