import React from 'react';
import '../styles/tailwind.css';
import HomeNav from './HomeNav';
import Hero from './Hero';
import Benefits from './Benefits';
import Tiers from './Tiers';
import Testimonials from './Testimonials';
import FinalCta from './FinalCta';
import HomeFooter from './HomeFooter';

function HomePage() {
  return (
    <div className="home-page bg-surface text-on-surface font-body-md overflow-x-hidden">
      <HomeNav />
      <main className="pt-20">
        <Hero />
        <Benefits />
        <Tiers />
        <Testimonials />
        <FinalCta />
      </main>
      <HomeFooter />
    </div>
  );
}

export default HomePage;
