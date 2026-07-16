import React from 'react';
import Logo from '../shared/Logo';

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
        <a className="font-body-md text-body-md text-on-primary-container/80 hover:text-white transition-colors" href="#privacy">
          Privacy Policy
        </a>
        <a className="font-body-md text-body-md text-on-primary-container/80 hover:text-white transition-colors" href="#terms">
          Terms of Service
        </a>
        <a className="font-body-md text-body-md text-on-primary-container/80 hover:text-white transition-colors" href="#support">
          Contact Support
        </a>
        <a className="font-body-md text-body-md text-on-primary-container/80 hover:text-white transition-colors" href="#security">
          Security Overview
        </a>
      </div>
    </footer>
  );
}

export default HomeFooter;
