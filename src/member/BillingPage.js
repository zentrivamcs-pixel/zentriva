import React, { useEffect, useState } from 'react';
import { useMemberAuth } from './MemberAuthContext';
import { memberApi } from '../shared/api';
import { parseDbDate, formatShortDate, paymentRowStatus } from './memberView';
import { SUPPORT_EMAIL } from '../shared/contact';

const naira = (kobo) => `₦${((kobo || 0) / 100).toLocaleString()}`;

function BillingPage() {
  const { view } = useMemberAuth();
  const [payments, setPayments] = useState(null); // null = loading
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    memberApi('/api/me/payments')
      .then((data) => { if (!cancelled) setPayments(data); })
      .catch((err) => {
        if (!cancelled) {
          setPayments([]);
          setError(err.message || 'Failed to load payments');
        }
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <div className="mb-8">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Billing</h2>
        <p className="font-body-md text-body-md text-secondary">
          Your membership plan, renewal date, and payment history.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Plan / renewal card */}
        <section className="lg:col-span-5 bg-primary-container text-on-primary-container rounded-xl p-8 shadow-lg relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-surface-container-highest opacity-10 rounded-full" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <h3 className="font-headline-md text-headline-md">Current Plan</h3>
              <span
                className={`px-3 py-1 font-label-sm text-label-sm rounded-full font-bold ${
                  view.active
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                    : 'bg-error-container text-on-error-container'
                }`}
              >
                {view.active ? 'ACTIVE' : 'RENEWAL DUE'}
              </span>
            </div>

            <p className="font-display-lg text-headline-lg font-bold mb-1">{view.tierName} Tier</p>
            <p className="font-body-md text-body-md opacity-80 mb-8">{view.tierLabel}</p>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-white/10">
                <span className="font-label-md text-label-md opacity-80">Annual Fee</span>
                <span className="font-label-md text-label-md font-bold">
                  ₦{view.tierFeeNaira.toLocaleString()}/year
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-white/10">
                <span className="font-label-md text-label-md opacity-80">Member Since</span>
                <span className="font-label-md text-label-md font-bold">{view.issuedDate}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-white/10">
                <span className="font-label-md text-label-md opacity-80">Next Renewal</span>
                <span className="font-label-md text-label-md font-bold">{view.nextRenewal}</span>
              </div>
            </div>

            <p className="font-label-sm text-label-sm opacity-60 mt-8">
              Online renewal payments are coming soon. We'll contact you before
              your renewal date — or reach us at{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline text-on-primary-container">
                {SUPPORT_EMAIL}
              </a>{' '}
              to renew or change tier.
            </p>
          </div>
        </section>

        {/* Payment history */}
        <section className="lg:col-span-7 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-outline-variant flex items-center gap-3">
            <span className="material-symbols-outlined text-primary p-2 bg-surface-container rounded-lg">
              receipt_long
            </span>
            <h3 className="font-headline-md text-headline-md">Payment History</h3>
          </div>

          {payments === null ? (
            <p className="p-8 text-secondary font-body-md animate-pulse">Loading payments…</p>
          ) : payments.length === 0 ? (
            <div className="p-8">
              <p className="text-secondary font-body-md">
                No payment records found{error ? ` (${error})` : ''}.
              </p>
              <p className="text-secondary font-label-sm text-label-sm mt-2">
                Payments made before this feature launched may not appear here.
                Your registration payment reference is still valid — contact
                support if anything looks wrong.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Reference</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {payments.map((payment) => {
                    const status = paymentRowStatus(payment.status);
                    return (
                      <tr key={payment.id} className="hover:bg-surface-container/30 transition-colors">
                        <td className="px-6 py-4 font-body-md text-body-md whitespace-nowrap">
                          {formatShortDate(parseDbDate(payment.paid_at || payment.created_at))}
                        </td>
                        <td className="px-6 py-4 font-body-md text-body-md capitalize">
                          {payment.description || 'Payment'}
                        </td>
                        <td className="px-6 py-4 font-label-sm text-label-sm text-secondary font-mono">
                          {payment.reference}
                        </td>
                        <td className="px-6 py-4 font-label-md text-label-md font-bold text-right whitespace-nowrap">
                          {naira(payment.amount_kobo)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-label-sm font-bold rounded-full ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default BillingPage;
