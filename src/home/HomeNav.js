import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../shared/Logo';

const NAV_LINKS = [
  { href: '#benefits', label: 'Benefits' },
  { href: '#tiers', label: 'Tiers' },
  { href: '#testimonials', label: 'Testimonials' },
  { href: '#about', label: 'About' },
];

function HomeNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all ${
        scrolled || menuOpen
          ? 'bg-surface/90 backdrop-blur-md shadow-sm'
          : 'bg-surface/60 backdrop-blur-sm'
      }`}
    >
      <div
        className={`flex justify-between items-center px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto transition-all ${
          scrolled ? 'py-2' : 'py-4'
        }`}
      >
        <Link
          to="/"
          onClick={closeMenu}
          className="flex items-center gap-2 text-headline-md font-headline-md font-bold text-primary tracking-tight"
        >
          <Logo className="h-9 w-9" />
          ZENTRIVA
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative font-label-md text-label-md text-secondary hover:text-primary transition-colors group py-1"
            >
              {link.label}
              <span className="absolute left-0 -bottom-0.5 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/member"
            className="px-5 py-2 text-label-md font-label-md text-secondary rounded-lg transition-all hover:text-primary hover:bg-surface-container"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-6 py-2.5 bg-primary text-on-primary rounded-lg text-label-md font-label-md hover:bg-primary/90 hover:shadow-lg transition-all"
          >
            Join Now
          </Link>
        </div>

        {/* Mobile hamburger toggle */}
        <button
          type="button"
          className="bg-transparent md:hidden relative z-50 flex h-10 w-10 items-center justify-center rounded-lg text-primary"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="material-symbols-outlined text-3xl">
            {menuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Mobile menu panel */}
      <div
        className={`md:hidden fixed inset-x-0 top-0 h-screen bg-surface/95 backdrop-blur-md transition-all duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col h-full pt-24 px-margin-mobile pb-10">
          <div className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="font-headline-md text-headline-md text-primary py-3 border-b border-outline-variant"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-3">
            <Link
              to="/member"
              onClick={closeMenu}
              className="w-full text-center px-6 py-3 text-label-md font-label-md text-primary border border-outline-variant rounded-lg"
            >
              Login
            </Link>
            <Link
              to="/register"
              onClick={closeMenu}
              className="w-full text-center px-6 py-3 bg-primary text-on-primary rounded-lg text-label-md font-label-md"
            >
              Join Now
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default HomeNav;
