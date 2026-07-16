import React from 'react';
import ImagePlaceholder from '../shared/ImagePlaceholder';

function About() {
  return (
    <section className="py-24 max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop" id="about">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-center">
        <div className="md:col-span-7">
          <span className="font-label-md text-label-md text-primary tracking-widest uppercase mb-4 block">
            About Zentriva
          </span>
          <h2 className="font-headline-lg text-headline-lg text-primary mb-6">
            A Cooperative Built for Skill, Empowerment, and Growth
          </h2>
          <div className="space-y-5 font-body-md text-body-md text-secondary">
            <p>
              Zentriva Multipurpose Cooperative Society Limited is a member-driven cooperative
              dedicated to skill training, empowerment, and individual upskilling. We exist to
              equip young people and aspiring professionals with practical, market-relevant
              skills that translate into real economic opportunity — whether through employment,
              entrepreneurship, or innovation.
            </p>
            <p>
              Through structured training programs, mentorship, and community-based learning,
              Zentriva helps members develop capabilities in business, technology, and creative
              fields while fostering a culture of growth and self-reliance. As a multipurpose
              cooperative, we go beyond training: we pool resources, support member ventures, and
              create pathways for collective empowerment and financial inclusion.
            </p>
            <p>
              Rooted in purpose and built for impact, Zentriva is committed to raising a
              generation of skilled, empowered individuals who create value for themselves and
              their communities.
            </p>
          </div>
        </div>
        <div className="md:col-span-5">
          <ImagePlaceholder
            icon="groups"
            alt="Zentriva members collaborating in a training session"
            shape="rect"
            className="w-full h-80 md:h-96 text-[56px] rounded-xl"
          />
        </div>
      </div>
    </section>
  );
}

export default About;
