import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/tailwind.css';
import HomeNav from './HomeNav';
import Hero from './Hero';
import About from './About';
import Benefits from './Benefits';
import Tiers from './Tiers';
import Testimonials from './Testimonials';
import Events from './Events';
import FinalCta from './FinalCta';
import HomeFooter from './HomeFooter';

function HomePage() {
  const { hash } = useLocation();

  // Links from other pages (e.g. the member portal's "Upgrade Tier" →
  // /#tiers) land here with a hash; scroll to that section once mounted.
  useEffect(() => {
    if (!hash) return;
    const el = document.querySelector(hash);
    if (el) {
      // Let App's scroll-to-top effect run first, then override it.
      requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth' }));
    }
  }, [hash]);

  return (
    <div className="home-page bg-surface text-on-surface font-body-md overflow-x-hidden">
      <HomeNav />
      <main className="pt-20">
        <Hero />
        <About />
        <Benefits />
        <Tiers />
        <Testimonials />
        <Events />
        <FinalCta />
      </main>
      <HomeFooter />
    </div>
  );
}

export default HomePage;
