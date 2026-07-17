import React from 'react';
import { NavLink } from 'react-router-dom';
import Logo from '../shared/Logo';
import { adminNav } from './adminNavConfig';
import { SUPPORT_EMAIL } from '../shared/contact';

// Fixed sidebar on md+ screens; a slide-in drawer (with backdrop) on mobile,
// toggled from the top nav's hamburger.
function AdminSideNav({ onLogout, open, onClose }) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="md:hidden fixed inset-0 bg-black/50 z-40 border-none"
        />
      )}

      <aside
        className={`flex h-screen w-64 fixed left-0 top-0 bg-primary-container shadow-md flex-col z-50 transition-transform duration-300 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-6 py-8 flex items-center gap-4">
          <Logo onDark className="w-10 h-10" />
          <div>
            <h1 className="text-headline-md font-headline-md font-bold text-on-primary">Zentriva CMS</h1>
            <p className="text-label-sm text-on-primary-container">Admin Portal</p>
          </div>
        </div>

        <nav className="flex-1 mt-4 space-y-1">
          {adminNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `px-6 py-3 flex items-center gap-3 transition-colors duration-200 no-underline ${
                  isActive
                    ? 'text-on-primary bg-primary border-l-4 border-tertiary-fixed-dim'
                    : 'text-on-primary-container hover:text-on-primary hover:bg-primary/50'
                }`
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-label-md text-label-md">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-6 space-y-4">
          <a
            href="/register"
            target="_blank"
            rel="noreferrer"
            className="w-full bg-tertiary-fixed-dim text-tertiary-container font-label-md text-label-md py-3 rounded-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all no-underline"
          >
            <span className="material-symbols-outlined">add_circle</span>
            New Entry
          </a>
          <div className="border-t border-outline-variant/20 pt-4 space-y-1">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-on-primary-container hover:text-on-primary px-2 py-2 flex items-center gap-3 transition-colors no-underline"
            >
              <span className="material-symbols-outlined">help_outline</span>
              <span className="text-label-md">Support</span>
            </a>
            <button
              type="button"
              onClick={onLogout}
              className="bg-transparent w-full text-on-primary-container hover:text-on-primary px-2 py-2 flex items-center gap-3 transition-colors"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="text-label-md">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default AdminSideNav;
