import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../shared/Logo';

const linkClass =
  'font-body-md text-body-md text-on-primary-container/80 hover:text-white transition-colors';

function HomeFooter() {
  return (
    <footer className="w-full py-12 px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-center max-w-container-max mx-auto bg-primary-container text-on-primary-container">
      <div className="flex flex-col items-center md:items-start mb-8 md:mb-0">
        <div className="flex items-center gap-3 mb-2">
          <Logo onDark className="h-10 w-10" />
          <div className="text-headline-md font-headline-md font-bold text-on-primary-container">
            ZENTRIVA MULTIPURPOSE COOPERATIVE SOCIETY
          </div>
        </div>
        <p className="text-label-sm font-label-sm text-on-primary-container/60">
          © 2026 ZENTRIVA MULTIPURPOSE COOPERATIVE SOCIETY. All rights reserved.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-8">
        <Link className={linkClass} to="/privacy">
          Privacy Policy
        </Link>
        <Link className={linkClass} to="/terms">
          Terms of Service
        </Link>
        <Link className={linkClass} to="/contact">
          Contact Support
        </Link>
      </div>
    </footer>
  );
}

export default HomeFooter;
