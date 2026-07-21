import React from 'react';
import { Link } from 'react-router-dom';
import { registrationFee } from './homeData';

function Tiers() {
  return (
    <section className="py-24 bg-surface-container-low" id="tiers">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="text-center mb-16">
          <h2 className="font-headline-lg text-headline-lg text-primary mb-4">Membership Registration</h2>
          <p className="font-body-md text-body-md text-secondary">
            One flat fee gives every member full access to Zentriva's training, network, and
            cooperative benefits.
          </p>
        </div>
        <div className="max-w-md mx-auto">
          <div className="bg-primary-container p-10 rounded-xl shadow-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-[32px] font-bold mb-2 text-white">{registrationFee.name} Membership</h3>
              <p className="font-body-md mb-8 text-on-primary-container">{registrationFee.description}</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-bold text-white">₦{registrationFee.price}</span>
                <span className="font-label-sm text-on-primary-container">/ year</span>
              </div>
              <ul className="space-y-4">
                {registrationFee.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 font-body-md text-white"
                  >
                    <span className="material-symbols-outlined text-sm text-tertiary-fixed-dim">
                      check_circle
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to="/register"
              className="mt-10 w-full py-3 bg-tertiary-fixed-dim text-on-tertiary-fixed font-label-md rounded-lg hover:brightness-110 transition-all shadow-lg text-center"
            >
              {registrationFee.cta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Tiers;
