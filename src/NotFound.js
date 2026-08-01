import React from 'react';
import { Link } from 'react-router-dom';
import './styles/tailwind.css';
import Logo from './shared/Logo';
import { useSeo } from './shared/seo';

// Unknown URLs used to render the homepage, which made every typo, stale
// link, and crawler probe a 200-OK copy of "/" — a soft 404. Google treats
// those as duplicates of the real homepage and they dilute it. This page
// says plainly that nothing is here, carries a noindex, and points at the
// pages that do exist.
//
// A static host can't return a real 404 status for a client-side route; the
// noindex is what keeps these out of the index.
function NotFound() {
  useSeo({ title: 'Page not found | Zentriva', noindex: true });

  return (
    <div className="bg-surface min-h-screen text-on-surface font-body-md flex items-center justify-center px-margin-mobile">
      <main className="max-w-lg text-center py-16">
        <Link to="/" className="inline-flex items-center gap-2 mb-8 no-underline text-primary">
          <Logo className="h-10 w-10" />
          <span className="font-headline-md text-headline-md font-bold">ZENTRIVA</span>
        </Link>

        <p className="font-label-md text-label-md text-on-surface-variant tracking-widest uppercase mb-2">
          Error 404
        </p>
        <h1 className="font-headline-lg text-headline-lg text-primary mb-4">
          We couldn't find that page
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mb-10">
          The link may be out of date, or the address may have been mistyped. Everything below
          is still where you'd expect it.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto px-6 py-3 bg-primary text-on-primary font-label-md text-label-md rounded-xl no-underline"
          >
            Back to Home
          </Link>
          <Link
            to="/register"
            className="w-full sm:w-auto px-6 py-3 border border-outline-variant text-on-surface font-label-md text-label-md rounded-xl no-underline"
          >
            Join Zentriva
          </Link>
        </div>

        <p className="mt-8 font-body-sm text-body-sm text-on-surface-variant">
          Looking for something specific? <Link to="/contact" className="text-primary font-bold">Contact us</Link>
          {' '}or sign in to the <Link to="/member" className="text-primary font-bold">member portal</Link>.
        </p>
      </main>
    </div>
  );
}

export default NotFound;
