import React from 'react';
import { NavLink } from 'react-router-dom';
import { mobileNav } from './navConfig';

function MobileNav() {
  return (
    <nav className="md:hidden print:hidden fixed bottom-0 left-0 right-0 bg-surface-container-lowest border-t border-outline-variant flex justify-around items-center h-16 z-40">
      {mobileNav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/member'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 ${
              isActive ? 'text-primary' : 'text-secondary'
            }`
          }
        >
          <span className="material-symbols-outlined">{item.icon}</span>
          <span className="text-[10px] font-label-sm">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default MobileNav;
