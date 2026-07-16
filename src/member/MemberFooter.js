import React from 'react';
import Logo from '../shared/Logo';

function MemberFooter() {
  return (
    <footer className="bg-surface-container-low border-t border-outline-variant w-full py-6 px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-4 z-10 mb-16 md:mb-0 print:hidden">
      <span className="flex items-center gap-2 font-label-md text-label-md font-bold text-primary">
        <Logo className="h-7 w-7" />
        Zentriva
      </span>
      <p className="font-label-sm text-label-sm text-secondary text-center">
        © 2026 Zentriva Membership Systems. All rights reserved.
      </p>
      <div className="flex gap-6">
        <a
          className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors"
          href="#privacy"
        >
          Privacy Policy
        </a>
        <a
          className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors"
          href="#terms"
        >
          Terms of Service
        </a>
        <a
          className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors"
          href="#support"
        >
          Contact Support
        </a>
      </div>
    </footer>
  );
}

export default MemberFooter;
