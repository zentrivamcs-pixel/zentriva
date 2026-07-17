import React from 'react';
import { Link } from 'react-router-dom';

function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden px-margin-mobile md:px-margin-desktop">
      <div className="absolute inset-0 z-0">
        {/* hero-bg.jpg has "Zentriva Multipurpose Cooperative Society" baked
            into it as large cursive text — blurred so it reads as texture
            behind the h1 instead of competing with it. scale-110 keeps the
            blur from revealing the image's edges. (JPEG at display size —
            the original 1.3MB PNG was 16x heavier for a blurred backdrop.) */}
        <div
          className="w-full h-full bg-cover bg-center scale-110"
          role="img"
          aria-label="Zentriva Multipurpose Cooperative Society members in a skills training session"
          style={{
            backgroundImage: `url("${process.env.PUBLIC_URL}/images/hero-bg.jpg")`,
            filter: 'blur(14px) brightness(0.6) saturate(1.05)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/65 z-10" />
      </div>
      <div className="relative z-20 text-center max-w-4xl py-16">
        <h1 className="text-white font-display-lg text-display-lg md:text-[64px]/[72px] text-balance mb-6">
          Skilled. Empowered. Rooted in Purpose.
        </h1>
        <p className="text-white/90 font-body-lg text-body-lg mb-10 max-w-2xl mx-auto">
          Zentriva is a member-driven cooperative equipping young people and aspiring
          professionals with practical, market-relevant skills — through training, mentorship,
          and community-based learning — for real economic opportunity.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-4 bg-tertiary-fixed-dim text-on-tertiary-fixed font-label-md text-label-md rounded-xl hover:scale-105 transition-transform shadow-lg"
          >
            Join Zentriva
          </Link>
          <a
            href="#tiers"
            className="w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-label-md text-label-md rounded-xl hover:bg-white/20 transition-all"
          >
            Explore Membership
          </a>
        </div>
      </div>
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce">
        <span className="material-symbols-outlined text-white opacity-50 text-4xl">
          keyboard_arrow_down
        </span>
      </div>
    </section>
  );
}

export default Hero;
