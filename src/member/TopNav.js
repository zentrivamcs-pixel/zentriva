import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import ImagePlaceholder from '../shared/ImagePlaceholder';
import Logo from '../shared/Logo';
import { useProfile } from './ProfileContext';

const TOP_LINKS = [
  { to: '/member', label: 'Dashboard', end: true },
  { to: '/member/directory', label: 'Directory' },
  { to: '/member/billing', label: 'Billing' },
];

function TopNav({ member }) {
  const navigate = useNavigate();
  const { avatarSrc } = useProfile();
  const [search, setSearch] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // The portal search searches the member directory.
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/member/directory?q=${encodeURIComponent(search.trim())}`);
    setMobileSearchOpen(false);
  };

  const linkClass = ({ isActive }) =>
    `px-4 py-2 rounded-lg font-label-md text-label-md transition-all ${
      isActive
        ? 'text-primary bg-surface-container-highest font-bold'
        : 'text-secondary hover:text-primary hover:bg-surface-container'
    }`;

  return (
    <header className="bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant shadow-sm sticky top-0 z-20 print:hidden">
      <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop w-full max-w-container-max mx-auto h-16 gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <Logo className="h-8 w-8 md:hidden" />
          <nav className="hidden md:flex items-center gap-1">
            {TOP_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-3">
          <form
            onSubmit={handleSearchSubmit}
            className="hidden lg:flex items-center bg-surface-container rounded-full px-4 py-1.5 border border-outline-variant focus-within:border-primary/40 transition-colors"
          >
            <span className="material-symbols-outlined text-secondary text-[20px]">
              search
            </span>
            <input
              className="bg-transparent border-none focus:ring-0 text-body-md text-on-surface w-48"
              placeholder="Search directory..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          <button
            type="button"
            aria-label="Search"
            onClick={() => setMobileSearchOpen((open) => !open)}
            className="bg-transparent lg:hidden p-2 text-secondary hover:text-primary transition-colors rounded-lg hover:bg-surface-container"
          >
            <span className="material-symbols-outlined">
              {mobileSearchOpen ? 'close' : 'search'}
            </span>
          </button>

          <div className="hidden sm:block h-6 w-px bg-outline-variant" />

          {/* Security stays reachable on mobile (it isn't in the bottom bar) */}
          <NavLink
            to="/member/security"
            aria-label="Security settings"
            title="Security settings"
            className={({ isActive }) =>
              `p-2 transition-colors rounded-lg hover:bg-surface-container ${
                isActive ? 'text-primary bg-surface-container-highest' : 'text-secondary hover:text-primary'
              }`
            }
          >
            <span className="material-symbols-outlined">shield_person</span>
          </NavLink>

          <NavLink to="/member/profile" className="flex items-center gap-2 pl-1 no-underline">
            <ImagePlaceholder
              src={avatarSrc}
              icon="person"
              alt={`${member.firstName}'s avatar`}
              shape="circle"
              className="h-9 w-9 border border-outline-variant text-[16px]"
            />
            <span className="hidden md:block font-label-md text-label-md text-primary">
              {member.firstName}
            </span>
          </NavLink>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="lg:hidden px-margin-mobile pb-3">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center bg-surface-container rounded-full px-4 py-2 border border-outline-variant"
          >
            <span className="material-symbols-outlined text-secondary text-[20px]">
              search
            </span>
            <input
              autoFocus
              className="bg-transparent border-none focus:ring-0 text-body-md text-on-surface w-full"
              placeholder="Search directory..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
        </div>
      )}
    </header>
  );
}

export default TopNav;
