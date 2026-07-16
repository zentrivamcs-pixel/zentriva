import React from 'react';
import ImagePlaceholder from '../shared/ImagePlaceholder';

function Benefits() {
  return (
    <section className="py-24 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop" id="benefits">
      <div className="mb-16">
        <h2 className="font-headline-lg text-headline-lg text-primary mb-4">Why Zentriva?</h2>
        <div className="w-24 h-1 bg-primary" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Skill Training */}
        <div className="md:col-span-8 group relative overflow-hidden bg-white border border-outline-variant p-8 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex flex-col h-full justify-between">
            <div>
              <span className="material-symbols-outlined text-4xl text-primary mb-6">school</span>
              <h3 className="font-headline-md text-headline-md mb-4">Structured Skill Training</h3>
              <p className="font-body-md text-body-md text-secondary max-w-md">
                Practical, market-relevant training programs in business, technology, and creative
                fields — built to translate into real employment, entrepreneurship, and innovation.
              </p>
            </div>
            <div className="mt-8 flex items-center text-primary font-label-md group-hover:gap-4 transition-all">
              Learn more <span className="material-symbols-outlined ml-2">arrow_forward</span>
            </div>
          </div>
        </div>

        {/* Mentorship */}
        <div className="md:col-span-4 bg-primary-container text-on-primary p-8 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <span
            className="material-symbols-outlined text-4xl text-tertiary-fixed-dim mb-6"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            diversity_3
          </span>
          <h3 className="font-headline-md text-headline-md mb-4 text-white">Mentorship &amp; Community</h3>
          <p className="font-body-md text-body-md text-on-primary-container">
            Learn alongside a community of members through mentorship and hands-on,
            community-based learning.
          </p>
        </div>

        {/* Member Ventures */}
        <div className="md:col-span-4 bg-surface-container-high p-8 rounded-xl border border-outline-variant transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <span className="material-symbols-outlined text-4xl text-primary mb-6">handshake</span>
          <h3 className="font-headline-md text-headline-md mb-4">Support for Member Ventures</h3>
          <p className="font-body-md text-body-md text-secondary">
            We pool resources and back member-led businesses, creating pathways for collective
            empowerment.
          </p>
        </div>

        {/* Financial Inclusion */}
        <div className="md:col-span-8 bg-white border border-outline-variant p-8 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md flex items-center">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span
                className="material-symbols-outlined text-4xl text-primary mb-6"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                savings
              </span>
              <h3 className="font-headline-md text-headline-md mb-4">Financial Inclusion</h3>
              <p className="font-body-md text-body-md text-secondary">
                As a multipurpose cooperative, we go beyond training — giving members pathways to
                savings, shared resources, and financial inclusion.
              </p>
            </div>
            <div className="hidden md:block">
              <ImagePlaceholder
                icon="volunteer_activism"
                alt="Financial inclusion illustration"
                shape="rect"
                className="w-full h-40 text-[40px]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Benefits;
