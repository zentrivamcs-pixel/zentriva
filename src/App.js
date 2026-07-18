import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Logo from './shared/Logo';
import './App.css';

// Route-level code splitting: each area (homepage, form, admin, member
// portal, legal pages) loads its own chunk instead of shipping everything —
// including the admin CMS and PDF tooling — to every visitor.
const HomePage = lazy(() => import('./home/HomePage'));
const FormPage = lazy(() => import('./FormPage'));
const AdminGate = lazy(() => import('./admin/AdminGate'));
const AdminOverview = lazy(() => import('./admin/AdminOverview'));
const AdminMembers = lazy(() => import('./admin/AdminMembers'));
const AdminInbox = lazy(() => import('./admin/AdminInbox'));
const MemberLayout = lazy(() => import('./member/MemberLayout'));
const Overview = lazy(() => import('./member/Overview'));
const MembershipId = lazy(() => import('./member/MembershipId'));
const ProfileInfo = lazy(() => import('./member/ProfileInfo'));
const SecurityPage = lazy(() => import('./member/SecurityPage'));
const BillingPage = lazy(() => import('./member/BillingPage'));
const DirectoryPage = lazy(() => import('./member/DirectoryPage'));
const ComingSoon = lazy(() => import('./member/ComingSoon'));
const PrivacyPolicy = lazy(() => import('./legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./legal/TermsOfService'));
const ResetPasswordPage = lazy(() => import('./member/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./member/VerifyEmailPage'));

function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-label="Loading page">
      <span className="route-fallback-dot" />
    </div>
  );
}

function App() {
  const location = useLocation();
  // The homepage, member portal, admin CMS, and legal pages ship their own
  // header/nav, so the plain public nav bar is only needed on the pages that
  // don't have one (currently just the registration form).
  const hasOwnNav = location.pathname === '/'
    || location.pathname.startsWith('/member')
    || location.pathname.startsWith('/admin')
    || location.pathname.startsWith('/privacy')
    || location.pathname.startsWith('/terms');

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
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<FormPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          {/* Public — the email reset link must work while logged out, so it
              lives outside the authenticated /member layout. */}
          <Route path="/member/reset" element={<ResetPasswordPage />} />
          <Route path="/member/verify" element={<VerifyEmailPage />} />

          <Route path="/admin" element={<AdminGate />}>
            <Route index element={<AdminOverview />} />
            <Route path="members" element={<AdminMembers />} />
            <Route path="inbox" element={<AdminInbox />} />
            <Route path="finances" element={<ComingSoon title="Finances" icon="account_balance" />} />
            <Route path="transactions" element={<ComingSoon title="Transactions" icon="receipt_long" />} />
            <Route path="settings" element={<ComingSoon title="Settings" icon="settings" />} />
          </Route>

          <Route path="/member" element={<MemberLayout />}>
            <Route index element={<Overview />} />
            <Route path="id" element={<MembershipId />} />
            <Route path="directory" element={<DirectoryPage />} />
            <Route path="profile" element={<ProfileInfo />} />
            <Route path="security" element={<SecurityPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="benefits" element={<ComingSoon title="Benefits" icon="star" />} />
          </Route>

          <Route path="*" element={<HomePage />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
