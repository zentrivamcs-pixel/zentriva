import React from 'react';
import ImagePlaceholder from '../shared/ImagePlaceholder';
import { events } from './homeData';

function EventCard({ event }) {
  const isPast = event.status === 'past';
  return (
    <div className="w-[280px] sm:w-[320px] flex-shrink-0 bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="relative">
        <ImagePlaceholder
          icon={event.icon}
          alt={event.title}
          shape="rect"
          className="w-full h-40 text-[36px]"
        />
        <span
          className={`absolute top-3 left-3 px-3 py-1 rounded-full text-label-sm font-label-sm ${
            isPast
              ? 'bg-surface-container-highest text-secondary'
              : 'bg-tertiary-fixed-dim text-on-tertiary-fixed'
          }`}
        >
          {isPast ? 'Past Event' : 'Upcoming'}
        </span>
      </div>
      <div className="p-6">
        <p className="font-label-sm text-label-sm text-primary tracking-widest uppercase mb-2">
          {event.date}
        </p>
        <h3 className="font-headline-md text-headline-md mb-2">{event.title}</h3>
        <p className="font-body-md text-body-md text-secondary">{event.description}</p>
      </div>
    </div>
  );
}

// Duplicates the row once so the looped animation (0 -> -50%) has a seamless
// second copy to hand off to — without the duplicate there'd be a visible
// jump/gap when the track resets.
function MarqueeRow({ items, animationClass, ariaLabel }) {
  const loop = [...items, ...items];
  return (
    <div
      className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
      role="group"
      aria-label={ariaLabel}
    >
      <div className={`flex gap-6 w-max ${animationClass} hover:[animation-play-state:paused]`}>
        {loop.map((event, i) => (
          <EventCard key={`${event.id}-${i}`} event={event} />
        ))}
      </div>
    </div>
  );
}

function Events() {
  const upcoming = events.filter((event) => event.status === 'upcoming');
  const past = events.filter((event) => event.status === 'past');

  return (
    <section className="py-24 bg-surface-container-low overflow-hidden" id="events">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-12">
        <span className="font-label-md text-label-md text-primary tracking-widest uppercase mb-4 block">
          Community
        </span>
        <h2 className="font-headline-lg text-headline-lg text-primary mb-4">Events</h2>
        <p className="font-body-md text-body-md text-secondary max-w-xl">
          From hands-on workshops to member meetups — see what's coming up and what our
          community has already built together.
        </p>
      </div>
      <div className="space-y-8">
        <MarqueeRow items={upcoming} animationClass="animate-marquee-fast" ariaLabel="Upcoming events" />
        <MarqueeRow items={past} animationClass="animate-marquee-slow" ariaLabel="Past events" />
      </div>
    </section>
  );
}

export default Events;
