import React from 'react';
import { Link } from 'react-router-dom';

function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden px-margin-mobile md:px-margin-desktop">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <div
          className="w-full h-full bg-cover bg-center scale-105"
          role="img"
          aria-label="Zentriva Multipurpose Cooperative Society boardroom"
          style={{ backgroundImage: `url("${process.env.PUBLIC_URL}/images/hero-bg.png")` }}
        />
      </div>
      <div className="relative z-20 text-center max-w-4xl">
        <h1 className="text-white font-display-lg text-display-lg md:text-[64px] leading-tight mb-6">
          Unlock the Elite Experience
        </h1>
        <p className="text-white/90 font-body-lg text-body-lg mb-10 max-w-2xl mx-auto">
          Access the world's most exclusive networks, bespoke concierge services, and high-security
          digital infrastructure designed for the modern executive.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-4 bg-tertiary-fixed-dim text-on-tertiary-fixed font-label-md text-label-md rounded-xl hover:scale-105 transition-transform shadow-lg"
          >
            Join the Network
          </Link>
          <a
            href="#tiers"
            className="w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-label-md text-label-md rounded-xl hover:bg-white/20 transition-all"
          >
            Explore Tiers
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
