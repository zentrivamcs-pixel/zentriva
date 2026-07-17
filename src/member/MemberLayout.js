import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import '../styles/tailwind.css';
import SideNav from './SideNav';
import TopNav from './TopNav';
import MobileNav from './MobileNav';
import MemberFooter from './MemberFooter';
import MemberLogin from './MemberLogin';
import { ProfileProvider } from './ProfileContext';
import { MemberAuthProvider, useMemberAuth } from './MemberAuthContext';

function MemberLayoutInner() {
  const { member, view, loading, logout } = useMemberAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-primary-container min-h-screen flex items-center justify-center">
        <p className="text-on-primary-container font-body-md animate-pulse">Loading your portal…</p>
      </div>
    );
  }

  if (!member) {
    return <MemberLogin />;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="member-portal bg-background text-on-background min-h-screen flex">
      <SideNav onLogout={handleLogout} tierLabel={view.tierLabel} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNav member={view} />

        <main className="flex-grow p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full pb-24 md:pb-margin-desktop">
          <Outlet />
        </main>

        <MemberFooter />
      </div>

      <MobileNav />
    </div>
  );
}

function MemberLayout() {
  return (
    <MemberAuthProvider>
      <ProfileProvider>
        <MemberLayoutInner />
      </ProfileProvider>
    </MemberAuthProvider>
  );
}

export default MemberLayout;
