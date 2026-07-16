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
        {/* Global Access */}
        <div className="md:col-span-8 group relative overflow-hidden bg-white border border-outline-variant p-8 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex flex-col h-full justify-between">
            <div>
              <span className="material-symbols-outlined text-4xl text-primary mb-6">public</span>
              <h3 className="font-headline-md text-headline-md mb-4">Global Access</h3>
              <p className="font-body-md text-body-md text-secondary max-w-md">
                Priority entry to 1,200+ exclusive lounges, private member clubs, and high-end
                workspaces across 80 countries.
              </p>
            </div>
            <div className="mt-8 flex items-center text-primary font-label-md group-hover:gap-4 transition-all">
              Learn more <span className="material-symbols-outlined ml-2">arrow_forward</span>
            </div>
          </div>
        </div>

        {/* Concierge */}
        <div className="md:col-span-4 bg-primary-container text-on-primary p-8 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <span
            className="material-symbols-outlined text-4xl text-tertiary-fixed-dim mb-6"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            support_agent
          </span>
          <h3 className="font-headline-md text-headline-md mb-4 text-white">Concierge Support</h3>
          <p className="font-body-md text-body-md text-on-primary-container">
            Dedicated 24/7 personal assistants for travel logistics, event booking, and lifestyle
            management.
          </p>
        </div>

        {/* Private Events */}
        <div className="md:col-span-4 bg-surface-container-high p-8 rounded-xl border border-outline-variant transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <span className="material-symbols-outlined text-4xl text-primary mb-6">confirmation_number</span>
          <h3 className="font-headline-md text-headline-md mb-4">Private Events</h3>
          <p className="font-body-md text-body-md text-secondary">
            Access to invitation-only networking events, industry summits, and intimate
            high-net-worth gatherings.
          </p>
        </div>

        {/* Digital Security */}
        <div className="md:col-span-8 bg-white border border-outline-variant p-8 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md flex items-center">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span
                className="material-symbols-outlined text-4xl text-primary mb-6"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                encrypted
              </span>
              <h3 className="font-headline-md text-headline-md mb-4">Digital Security</h3>
              <p className="font-body-md text-body-md text-secondary">
                Military-grade encryption for all member communications and a secure digital vault
                for sensitive documents.
              </p>
            </div>
            <div className="hidden md:block">
              <ImagePlaceholder
                icon="shield"
                alt="Digital security illustration"
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
