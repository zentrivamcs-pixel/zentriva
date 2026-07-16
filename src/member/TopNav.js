import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import ImagePlaceholder from '../shared/ImagePlaceholder';
import Logo from '../shared/Logo';

const TOP_LINKS = [
  { to: '/member', label: 'Dashboard', end: true },
  { href: '#members', label: 'Members' },
  { href: '#benefits', label: 'Benefits' },
  { href: '#events', label: 'Events' },
];

function TopNav({ member }) {
  const [search, setSearch] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

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
            {TOP_LINKS.map((link) =>
              link.to ? (
                <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                  {link.label}
                </NavLink>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 rounded-lg font-label-md text-label-md text-secondary hover:text-primary hover:bg-surface-container transition-all"
                >
                  {link.label}
                </a>
              )
            )}
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-3">
          <div className="hidden lg:flex items-center bg-surface-container rounded-full px-4 py-1.5 border border-outline-variant focus-within:border-primary/40 transition-colors">
            <span className="material-symbols-outlined text-secondary text-[20px]">
              search
            </span>
            <input
              className="bg-transparent border-none focus:ring-0 text-body-md text-on-surface w-48"
              placeholder="Search portal..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

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

          <button
            type="button"
            aria-label="Notifications"
            className="bg-transparent relative p-2 text-secondary hover:text-primary transition-colors rounded-lg hover:bg-surface-container"
          >
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-error border border-surface-container-lowest" />
          </button>
          <button
            type="button"
            aria-label="Settings"
            className="bg-transparent hidden sm:inline-flex p-2 text-secondary hover:text-primary transition-colors rounded-lg hover:bg-surface-container"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>

          <div className="flex items-center gap-2 pl-1">
            <ImagePlaceholder
              icon="person"
              alt={`${member.firstName}'s avatar`}
              shape="circle"
              className="h-9 w-9 border border-outline-variant text-[16px]"
            />
            <span className="hidden md:block font-label-md text-label-md text-primary">
              {member.firstName}
            </span>
          </div>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="lg:hidden px-margin-mobile pb-3">
          <div className="flex items-center bg-surface-container rounded-full px-4 py-2 border border-outline-variant">
            <span className="material-symbols-outlined text-secondary text-[20px]">
              search
            </span>
            <input
              autoFocus
              className="bg-transparent border-none focus:ring-0 text-body-md text-on-surface w-full"
              placeholder="Search portal..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}
    </header>
  );
}

export default TopNav;
