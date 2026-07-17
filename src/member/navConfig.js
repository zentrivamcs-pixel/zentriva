export const sidebarNav = [
  { label: 'Overview', icon: 'dashboard', to: '/member' },
  { label: 'Membership ID', icon: 'badge', to: '/member/id' },
  { label: 'Directory', icon: 'groups', to: '/member/directory' },
  { label: 'Profile Info', icon: 'person', to: '/member/profile' },
  { label: 'Billing', icon: 'payments', to: '/member/billing' },
  { label: 'Security', icon: 'security', to: '/member/security' },
];

// Bottom bar fits five items; Security lives behind the shield icon in the
// top nav so it stays reachable on mobile too.
export const mobileNav = [
  { label: 'Overview', icon: 'dashboard', to: '/member' },
  { label: 'ID', icon: 'badge', to: '/member/id' },
  { label: 'Directory', icon: 'groups', to: '/member/directory' },
  { label: 'Billing', icon: 'payments', to: '/member/billing' },
  { label: 'Profile', icon: 'person', to: '/member/profile' },
];
