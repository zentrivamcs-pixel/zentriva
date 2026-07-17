import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../shared/Logo';
import { SUPPORT_EMAIL } from '../shared/contact';

const linkClass =
  'font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors';

function MemberFooter() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant w-full py-6 px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-4 z-10 mb-16 md:mb-0 print:hidden">
      <span className="flex items-center gap-2 font-label-md text-label-md font-bold text-primary">
        <Logo className="h-7 w-7" />
        Zentriva
      </span>
      <p className="font-label-sm text-label-sm text-secondary text-center">
        © 2026 Zentriva Multipurpose Cooperative Society. All rights reserved.
      </p>
      <div className="flex gap-6">
        <Link className={linkClass} to="/privacy">
          Privacy Policy
        </Link>
        <Link className={linkClass} to="/terms">
          Terms of Service
        </Link>
        <a className={linkClass} href={`mailto:${SUPPORT_EMAIL}`}>
          Contact Support
        </a>
      </div>
    </footer>
  );
}

export default MemberFooter;
