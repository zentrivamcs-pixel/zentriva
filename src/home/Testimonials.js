import React from 'react';
import { testimonials } from './homeData';

function Testimonials() {
  return (
    <section className="py-24 bg-white" id="testimonials">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="flex flex-col md:flex-row gap-16 items-center">
          <div className="w-full md:w-1/3" id="about">
            <h2 className="font-headline-lg text-headline-lg text-primary mb-6">
              Trusted by World-Class Organizations
            </h2>
            <p className="text-secondary font-body-md mb-8">
              Our members represent the pinnacle of leadership across technology, finance, and the
              arts.
            </p>
            <div className="grid grid-cols-2 gap-8 opacity-40">
              <div className="h-8 bg-secondary/20 rounded" />
              <div className="h-8 bg-secondary/20 rounded" />
              <div className="h-8 bg-secondary/20 rounded" />
              <div className="h-8 bg-secondary/20 rounded" />
            </div>
          </div>
          <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="p-8 bg-surface-container rounded-xl italic relative">
                <span className="material-symbols-outlined absolute top-4 left-4 text-primary/10 text-6xl">
                  format_quote
                </span>
                <p className="text-on-surface font-body-md mb-6 relative z-10">{testimonial.quote}</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary-fixed" />
                  <div>
                    <p className="font-label-md text-label-md text-primary">{testimonial.name}</p>
                    <p className="text-secondary text-label-sm font-label-sm">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
