// Placeholder security data — replace with real auth/session data once a
// member accounts backend exists.
export const twoFactorMethods = [
  { key: 'authenticator', icon: 'smartphone', label: 'Authenticator App', enabled: true },
  { key: 'sms', icon: 'mail', label: 'SMS Backup', enabled: false },
];

export const initialLoginSessions = [
  {
    id: 1,
    icon: 'desktop_windows',
    device: 'Chrome on macOS',
    sublabel: 'Desktop • Current Session',
    location: 'New York, USA',
    ip: '192.168.1.45',
    status: 'ACTIVE',
    lastActivity: 'Just now',
    isCurrent: true,
  },
  {
    id: 2,
    icon: 'smartphone',
    device: 'iPhone 14 Pro',
    sublabel: 'Zentriva iOS App',
    location: 'London, UK',
    ip: '45.22.10.12',
    status: 'OFFLINE',
    lastActivity: '2 hours ago',
    isCurrent: false,
  },
  {
    id: 3,
    icon: 'public',
    device: 'Safari on iPad',
    sublabel: 'Tablet Web',
    location: 'Paris, France',
    ip: '82.112.5.99',
    status: 'OFFLINE',
    lastActivity: 'Oct 24, 2023',
    isCurrent: false,
  },
];

export const recoveryEmailMasked = 'm***a@example.com';
