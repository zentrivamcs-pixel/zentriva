import { MEMBERSHIP_TIERS } from '../shared/membershipTiers';

export const registrationFee = {
  name: MEMBERSHIP_TIERS.standard.name,
  description: 'One flat registration fee for full membership access.',
  price: MEMBERSHIP_TIERS.standard.priceNaira.toLocaleString(),
  features: [
    'Access to Core Training Programs',
    'Digital Member Network',
    'Support for Member Ventures',
    'Access to Pooled Resources',
    'Email Support',
  ],
  cta: 'Register Now',
};

export const testimonials = [
  {
    quote:
      '"The training program gave me practical skills I could use immediately. Within months, the mentorship and community support helped me launch my own small business."',
    name: 'Amaka Nwosu',
    role: 'Zentriva Member, Entrepreneur',
  },
  {
    quote:
      '"Zentriva is more than a training provider — it\'s a community. Pooling resources with other members opened doors I couldn\'t have opened on my own."',
    name: 'David Okafor',
    role: 'Zentriva Member, Tech Freelancer',
  },
];

export const events = [
  {
    id: 'digital-skills-bootcamp',
    status: 'upcoming',
    date: 'August 2026',
    title: 'Digital Skills Bootcamp',
    description: 'A hands-on week covering web development, design tools, and freelancing basics for new members.',
    icon: 'code',
  },
  {
    id: 'member-mentorship-mixer',
    status: 'upcoming',
    date: 'September 2026',
    title: 'Member Mentorship Mixer',
    description: 'An evening connecting new members with mentors across business, tech, and creative fields.',
    icon: 'diversity_3',
  },
  {
    id: 'small-business-clinic',
    status: 'upcoming',
    date: 'October 2026',
    title: 'Small Business Clinic',
    description: 'One-on-one sessions helping member-led ventures with financial planning and pooled-resource access.',
    icon: 'storefront',
  },
  {
    id: 'creative-arts-workshop',
    status: 'upcoming',
    date: 'November 2026',
    title: 'Creative Arts Workshop',
    description: 'Practical training in design and content creation for members building in the creative economy.',
    icon: 'palette',
  },
  {
    id: 'founders-cohort-graduation',
    status: 'past',
    date: 'June 2026',
    title: 'Founders Cohort Graduation',
    description: 'Celebrating the first cohort of members who completed the entrepreneurship training track.',
    icon: 'workspace_premium',
  },
  {
    id: 'tech-upskilling-workshop',
    status: 'past',
    date: 'April 2026',
    title: 'Tech Upskilling Workshop',
    description: 'A weekend intensive on foundational tech skills, drawing members from across the community.',
    icon: 'terminal',
  },
  {
    id: 'community-town-hall',
    status: 'past',
    date: 'February 2026',
    title: 'Community Town Hall',
    description: 'Members gathered to shape the cooperative\'s training roadmap and resource-pooling plans for the year.',
    icon: 'campaign',
  },
  {
    id: 'launch-day',
    status: 'past',
    date: 'January 2026',
    title: 'Zentriva Launch Day',
    description: 'The official launch of Zentriva Multipurpose Cooperative Society and its founding membership drive.',
    icon: 'celebration',
  },
];
