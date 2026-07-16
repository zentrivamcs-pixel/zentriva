import { MEMBERSHIP_TIERS } from '../shared/membershipTiers';

export const membershipTiers = [
  {
    key: 'standard',
    eyebrow: 'Essential Access',
    name: MEMBERSHIP_TIERS.standard.name,
    description: 'For emerging leaders and occasional travelers.',
    price: MEMBERSHIP_TIERS.standard.priceNaira.toLocaleString(),
    features: [
      '10 Lounge Visits/Year',
      'Digital Member Network',
      'Email Concierge Support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    key: 'premium',
    eyebrow: 'Full Network Access',
    name: MEMBERSHIP_TIERS.premium.name,
    description: 'Comprehensive support for the frequent global traveler.',
    price: MEMBERSHIP_TIERS.premium.priceNaira.toLocaleString(),
    features: [
      'Unlimited Lounge Access',
      '24/7 Dedicated Concierge',
      'Quarterly VIP Events',
      'Priority Partner Bookings',
    ],
    cta: 'Upgrade to Premium',
    highlighted: true,
  },
  {
    key: 'elite',
    eyebrow: 'Bespoke Experience',
    name: MEMBERSHIP_TIERS.elite.name,
    description: 'The pinnacle of membership with unlimited possibilities.',
    price: MEMBERSHIP_TIERS.elite.priceNaira.toLocaleString(),
    features: [
      'Private Jet Catering Access',
      'Executive Protection Services',
      'Global Asset Management',
    ],
    cta: 'Inquire Now',
    highlighted: false,
  },
];

export const testimonials = [
  {
    quote:
      '"Zentriva has redefined how I manage my global schedule. Their concierge team is more than just support; they are a strategic asset to my executive life."',
    name: 'Sarah J. Miller',
    role: 'CEO, NexaCorp Systems',
  },
  {
    quote:
      '"The security and privacy afforded by the Elite tier is unparalleled. In a world of digital vulnerability, Zentriva is my safe haven for high-level operations."',
    name: 'Marcus Vancet',
    role: 'Managing Director, Venture Crest',
  },
];
