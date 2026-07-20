import React, { useState } from 'react';
import { MEMBERSHIP_TIERS } from '../shared/membershipTiers';
import { PAYSTACK_ENABLED, BANK_TRANSFER_DETAILS } from '../shared/paymentConfig';

const TABS = [
  { key: 'general', label: 'General', icon: 'settings_suggest' },
  { key: 'membership', label: 'Membership Tiers', icon: 'badge' },
  { key: 'payments', label: 'Payment Methods', icon: 'account_balance_wallet' },
  { key: 'security', label: 'Security & Access', icon: 'security' },
];

const CARD = 'bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-8';

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between gap-4 border-b border-outline-variant/40 py-3">
    <span className="text-label-md text-on-surface-variant">{label}</span>
    <span className="text-body-md text-on-surface text-right font-medium">{value}</span>
  </div>
);

const SectionHeader = ({ title, description }) => (
  <div className="border-b border-outline-variant pb-4 mb-6">
    <h4 className="font-headline-md text-headline-md text-on-surface">{title}</h4>
    <p className="text-on-surface-variant text-body-md mt-1">{description}</p>
  </div>
);

function GeneralSection() {
  return (
    <div>
      <SectionHeader
        title="General Branding & Localization"
        description="Core identity and regional settings for the cooperative portal."
      />
      <div className="max-w-xl">
        <InfoRow label="Society Name" value="Zentriva Multipurpose Cooperative Society" />
        <InfoRow label="Currency" value="₦ Nigerian Naira (NGN)" />
        <InfoRow label="Timezone" value="West Africa Time (GMT+1)" />
      </div>
      <p className="text-label-sm text-outline mt-6">
        These values are fixed for the Zentriva platform and aren't stored per-deployment —
        contact a developer to change them.
      </p>
    </div>
  );
}

function MembershipSection() {
  return (
    <div>
      <SectionHeader
        title="Membership Tier Pricing"
        description="Registration fees charged for each membership tier."
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.values(MEMBERSHIP_TIERS).map((tier) => (
          <div key={tier.key} className="p-5 border border-outline-variant rounded-xl bg-surface-container-low">
            <span className="px-2 py-1 bg-primary-container text-on-primary text-label-sm font-bold rounded uppercase">
              {tier.name}
            </span>
            <p className="font-headline-md text-headline-md text-primary mt-3">
              ₦{tier.priceNaira.toLocaleString()}
            </p>
            <p className="text-label-sm text-on-surface-variant">per year</p>
          </div>
        ))}
      </div>
      <p className="text-label-sm text-outline mt-6">
        Tier pricing is defined in <code>shared/membershipTiers.js</code> and shared by the
        registration form, billing, and finance reports — contact a developer to change it.
      </p>
    </div>
  );
}

function PaymentsSection() {
  return (
    <div>
      <SectionHeader
        title="Payment Methods"
        description="How members pay their registration fee, and the account members transfer to."
      />
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border border-outline-variant">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">account_balance</span>
            <div>
              <p className="text-label-md font-bold text-on-surface">Bank Transfer</p>
              <p className="text-label-sm text-on-surface-variant">
                Registrations are reviewed and approved from the Transactions page.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-label-sm font-bold bg-secondary-container text-on-secondary-container">
            Active
          </span>
        </div>

        <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border border-outline-variant">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">credit_card</span>
            <div>
              <p className="text-label-md font-bold text-on-surface">Paystack (Card)</p>
              <p className="text-label-sm text-on-surface-variant">
                Instant card payment — currently paused on the registration form.
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-label-sm font-bold ${PAYSTACK_ENABLED
            ? 'bg-secondary-container text-on-secondary-container'
            : 'bg-tertiary-container text-on-tertiary-container'}`}
          >
            {PAYSTACK_ENABLED ? 'Active' : 'On Hold'}
          </span>
        </div>
      </div>

      <h5 className="font-label-md text-label-md text-on-surface mt-8 mb-3">Bank Transfer Account</h5>
      <div className="max-w-xl">
        <InfoRow label="Bank" value={BANK_TRANSFER_DETAILS.bankName} />
        <InfoRow label="Account Number" value={BANK_TRANSFER_DETAILS.accountNumber} />
        <InfoRow label="Account Name" value={BANK_TRANSFER_DETAILS.accountName} />
      </div>
      <p className="text-label-sm text-outline mt-6">
        Shown to members on the registration form. Defined in{' '}
        <code>src/shared/paymentConfig.js</code> — update there to change it everywhere at once.
      </p>
    </div>
  );
}

function SecuritySection() {
  return (
    <div>
      <SectionHeader
        title="Security & Access"
        description="How the admin dashboard is protected."
      />
      <div className="space-y-4">
        <div className="p-5 bg-surface-container-low rounded-lg border border-outline-variant">
          <p className="font-label-md text-on-surface font-bold mb-1">Shared Admin Password</p>
          <p className="text-label-sm text-on-surface-variant">
            The admin dashboard is protected by a single password set in the{' '}
            <code>ADMIN_PASSWORD</code> environment variable. To change it, update that variable
            in your hosting provider's dashboard (Vercel → Project → Settings → Environment
            Variables) and redeploy.
          </p>
        </div>
        <div className="p-5 bg-surface-container-low rounded-lg border border-outline-variant">
          <p className="font-label-md text-on-surface font-bold mb-1">Session Duration</p>
          <p className="text-label-sm text-on-surface-variant">
            Admin sessions are signed tokens that expire automatically after 12 hours, after
            which you'll be asked to sign in again.
          </p>
        </div>
      </div>
    </div>
  );
}

const SECTION_COMPONENTS = {
  general: GeneralSection,
  membership: MembershipSection,
  payments: PaymentsSection,
  security: SecuritySection,
};

function AdminSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const ActiveSection = SECTION_COMPONENTS[activeTab];

  return (
    <>
      <div>
        <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">System Settings</h2>
        <p className="text-on-surface-variant text-body-md">
          Reference configuration for the Zentriva Multipurpose Cooperative Society.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter mt-gutter">
        <div className="md:col-span-3 flex md:flex-col gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary-container text-on-primary font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined">{tab.icon}</span>
              <span className="text-label-md">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="md:col-span-9">
          <div className={CARD}>
            <ActiveSection />
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminSettings;
