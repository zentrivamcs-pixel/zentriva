import React from 'react';
import { NavLink } from 'react-router-dom';
import { sidebarNav } from './navConfig';
import Logo from '../shared/Logo';
import { currentMember } from './memberData';

function SideNav({ onLogout }) {
  return (
    <aside className="hidden md:flex print:hidden flex-col h-screen sticky top-0 p-gutter bg-primary-container text-on-primary-container w-64 shadow-md z-30">
      <div className="flex items-center gap-3 mb-10">
        <Logo onDark className="w-10 h-10 flex-shrink-0" />
        <div className="min-w-0">
          <h1 className="font-label-md text-label-md font-bold leading-tight text-on-primary-container whitespace-nowrap">
            Zentriva Portal
          </h1>
          <p className="font-label-sm text-label-sm opacity-70 mt-1">
            {currentMember.tierLabel}
          </p>
        </div>
      </div>

      <nav className="flex-grow space-y-2">
        {sidebarNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/member'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-label-md text-label-md ${
                isActive
                  ? 'text-primary bg-surface-container-highest font-bold scale-95 active:scale-90'
                  : 'text-on-primary-container opacity-80 hover:bg-primary/10 cursor-pointer'
              }`
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-on-primary-container/10 pt-6 space-y-2">
        <button
          type="button"
          className="w-full py-3 px-4 bg-tertiary-fixed text-on-tertiary-fixed font-bold rounded-lg mb-4 hover:opacity-90 transition-opacity"
        >
          Upgrade Tier
        </button>
        <a
          className="flex items-center gap-3 px-4 py-2 text-on-primary-container opacity-80 hover:bg-primary/10 transition-all cursor-pointer"
          href="#help"
        >
          <span className="material-symbols-outlined">help</span>
          <span className="font-label-md text-label-md">Help Center</span>
        </a>
        <button
          type="button"
          onClick={onLogout}
          className="bg-transparent w-full flex items-center gap-3 px-4 py-2 text-on-primary-container opacity-80 hover:bg-primary/10 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-label-md text-label-md">Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default SideNav;
