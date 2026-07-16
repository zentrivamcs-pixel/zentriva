// Placeholder data specific to the Membership ID page — replace with real
// usage/security data once a member accounts backend exists.
export const usageSummary = [
  {
    key: 'lounge',
    icon: 'apartment',
    iconBg: 'bg-secondary-container',
    iconColor: 'text-on-secondary-container',
    title: 'Lounge Access',
    subtitle: 'Global Network',
    value: '12/∞',
  },
  {
    key: 'events',
    icon: 'event_available',
    iconBg: 'bg-tertiary-container',
    iconColor: 'text-tertiary-fixed-dim',
    title: 'Exclusive Events',
    subtitle: 'Priority Entry',
    value: '4/5',
  },
];

export const securityStatus = {
  label: 'Active',
  lastVerified: '2 hours ago',
};

export const idFeatureCards = [
  {
    key: 'biometric',
    icon: 'lock',
    title: 'Biometric Lock',
    description: 'Require FaceID or TouchID before displaying your digital card on mobile devices.',
  },
  {
    key: 'nfc',
    icon: 'contactless',
    title: 'NFC Wallet',
    description: 'Add your Zentriva ID to Apple Wallet or Google Pay for seamless contactless verification.',
  },
  {
    key: 'renewal',
    icon: 'history',
    title: 'Auto-Renewal',
    description: 'Your membership ID is set to renew automatically. Manage settings here.',
  },
];
