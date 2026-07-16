import React from 'react';
import { Link } from 'react-router-dom';

function FinalCta() {
  return (
    <section className="relative py-32 bg-primary overflow-hidden">
      <div className="relative z-10 max-w-container-max mx-auto px-margin-mobile text-center">
        <h2 className="text-white font-display-lg text-display-lg mb-8">
          Your Growth Journey Starts Here
        </h2>
        <p className="text-on-primary-container font-body-lg text-body-lg mb-12 max-w-2xl mx-auto">
          Join a community of members building real skills, real ventures, and real
          opportunity — together.
        </p>
        <Link
          to="/register"
          className="inline-block px-12 py-5 bg-white text-primary font-label-md text-[18px] rounded-xl hover:scale-105 transition-transform shadow-2xl"
        >
          Get Started Today
        </Link>
      </div>
    </section>
  );
}

export default FinalCta;
