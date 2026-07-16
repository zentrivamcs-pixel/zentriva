import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import '../styles/tailwind.css';
import SideNav from './SideNav';
import TopNav from './TopNav';
import MobileNav from './MobileNav';
import MemberFooter from './MemberFooter';
import { currentMember } from './memberData';
import { ProfileProvider } from './ProfileContext';

function MemberLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <ProfileProvider>
      <div className="member-portal bg-background text-on-background min-h-screen flex">
        <SideNav onLogout={handleLogout} />

        <div className="flex-1 flex flex-col min-w-0">
          <TopNav member={currentMember} />

          <main className="flex-grow p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full">
            <Outlet />
          </main>

          <MemberFooter />
        </div>

        <MobileNav />
      </div>
    </ProfileProvider>
  );
}

export default MemberLayout;
