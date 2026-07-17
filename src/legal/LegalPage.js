import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/tailwind.css';
import Logo from '../shared/Logo';
import { SUPPORT_EMAIL } from '../shared/contact';

// Shared shell for the Privacy Policy and Terms of Service pages.
function LegalPage({ title, updated, children }) {
  return (
    <div className="bg-surface min-h-screen text-on-surface font-body-md">
      <header className="bg-primary-container text-on-primary-container">
        <div className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-10">
          <Link to="/" className="flex items-center gap-2 mb-6 no-underline text-on-primary-container">
            <Logo onDark className="h-9 w-9" />
            <span className="font-headline-md text-headline-md font-bold">ZENTRIVA</span>
          </Link>
          <h1 className="font-headline-lg text-headline-lg font-bold">{title}</h1>
          <p className="font-label-sm text-label-sm opacity-70 mt-2">Last updated: {updated}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-10 legal-content">
        {children}

        <div className="mt-12 pt-8 border-t border-outline-variant">
          <p className="font-body-md text-body-md text-secondary">
            Questions about this document? Contact us at{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary font-bold">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <p className="mt-4">
            <Link to="/" className="text-primary font-label-md hover:underline">
              ← Back to Home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default LegalPage;
