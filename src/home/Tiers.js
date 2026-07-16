import React from 'react';
import { Link } from 'react-router-dom';
import { membershipTiers } from './homeData';

function Tiers() {
  return (
    <section className="py-24 bg-surface-container-low" id="tiers">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="text-center mb-16">
          <h2 className="font-headline-lg text-headline-lg text-primary mb-4">Membership Tiers</h2>
          <p className="font-body-md text-body-md text-secondary">
            Select the level of access that matches where you are in your training and growth
            journey.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {membershipTiers.map((tier) => (
            <div
              key={tier.key}
              className={
                tier.highlighted
                  ? 'bg-primary-container p-10 rounded-xl relative shadow-2xl transform md:scale-105 z-10 flex flex-col justify-between'
                  : 'bg-white p-10 rounded-xl border border-outline-variant flex flex-col justify-between'
              }
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-tertiary-fixed-dim text-on-tertiary-fixed px-4 py-1 rounded-full text-label-sm font-label-sm">
                  MOST POPULAR
                </div>
              )}
              <div>
                <span
                  className={`text-label-sm font-label-sm tracking-widest uppercase mb-4 block ${
                    tier.highlighted ? 'text-on-primary-container' : 'text-secondary'
                  }`}
                >
                  {tier.eyebrow}
                </span>
                <h3 className={`text-[32px] font-bold mb-2 ${tier.highlighted ? 'text-white' : 'text-primary'}`}>
                  {tier.name}
                </h3>
                <p className={`font-body-md mb-8 ${tier.highlighted ? 'text-on-primary-container' : 'text-secondary'}`}>
                  {tier.description}
                </p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className={`text-4xl font-bold ${tier.highlighted ? 'text-white' : 'text-primary'}`}>
                    {tier.price}
                  </span>
                  <span className={`font-label-sm ${tier.highlighted ? 'text-on-primary-container' : 'text-secondary'}`}>
                    / year
                  </span>
                </div>
                <ul className="space-y-4">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex items-center gap-3 font-body-md ${
                        tier.highlighted ? 'text-white' : 'text-secondary'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-sm ${
                          tier.highlighted ? 'text-tertiary-fixed-dim' : 'text-on-tertiary-container'
                        }`}
                      >
                        check_circle
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                to={`/register?tier=${tier.key}`}
                className={
                  tier.highlighted
                    ? 'mt-10 w-full py-3 bg-tertiary-fixed-dim text-on-tertiary-fixed font-label-md rounded-lg hover:brightness-110 transition-all shadow-lg text-center'
                    : 'mt-10 w-full py-3 border border-primary text-primary font-label-md rounded-lg hover:bg-primary hover:text-white transition-all text-center'
                }
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Tiers;
