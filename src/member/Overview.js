import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ImagePlaceholder from '../shared/ImagePlaceholder';
import QrVerificationCode from './QrVerificationCode';
import { buildMembershipQrValue } from './membershipQr';
import { useMemberAuth } from './MemberAuthContext';
import { useProfile } from './ProfileContext';
import { memberApi } from '../shared/api';
import { parseDbDate, formatShortDate } from './memberView';
import { quickBenefits } from './memberData';
import { events } from '../home/homeData';

function Overview() {
  const { view } = useMemberAuth();
  const { avatarSrc } = useProfile();
  const [payments, setPayments] = useState(null); // null = loading

  const qrValue = useMemo(() => buildMembershipQrValue(view), [view]);
  const nextEvent = useMemo(() => events.find((e) => e.status === 'upcoming'), []);

  useEffect(() => {
    let cancelled = false;
    memberApi('/api/me/payments')
      .then((data) => { if (!cancelled) setPayments(data); })
      .catch(() => { if (!cancelled) setPayments([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <section className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-primary">
              Welcome back, {view.firstName}
            </h2>
            <p className="font-body-lg text-body-lg text-secondary mt-1">
              {view.active
                ? 'Your membership is active. Here is your overview.'
                : 'Your membership is due for renewal. Here is your overview.'}
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href="/#events"
              className="bg-primary text-on-primary px-6 py-3 font-label-md text-label-md rounded shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2 no-underline"
            >
              <span className="material-symbols-outlined text-[18px]">event</span>
              View Upcoming Events
            </a>
          </div>
        </div>
      </section>

      <div className="bento-grid">
        {/* Membership Status Card */}
        <div
          className="col-span-12 lg:col-span-8 glass-card rounded-xl p-8 shadow-sm flex flex-col md:flex-row gap-8 items-center overflow-hidden relative animate-fade-in-up transition-transform duration-300 hover:-translate-y-0.5"
          style={{ animationDelay: '0s' }}
        >
          <div className="flex-shrink-0 h-32 w-32 rounded-full border-4 border-surface-container-high p-1">
            <ImagePlaceholder
              src={avatarSrc}
              icon="person"
              alt={`${view.firstName}'s profile photo`}
              shape="circle"
              className="h-full w-full text-[40px]"
            />
          </div>
          <div className="flex-grow">
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-label-sm font-label-sm mb-4 ${
                view.active
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'bg-error-container text-on-error-container'
              }`}
            >
              {view.statusLabel}
            </div>
            <h3 className="font-headline-md text-headline-md text-primary mb-2">
              {view.tierLabel}
            </h3>
            <p className="font-body-md text-body-md text-secondary mb-6 max-w-lg">
              {view.tierDescription}
            </p>
            <div className="flex gap-8">
              <div>
                <p className="text-label-sm font-label-sm text-outline uppercase tracking-wider">
                  Member Since
                </p>
                <p className="font-headline-md text-headline-md text-primary">
                  {view.memberSince}
                </p>
              </div>
              <div>
                <p className="text-label-sm font-label-sm text-outline uppercase tracking-wider">
                  Next Renewal
                </p>
                <p className="font-headline-md text-headline-md text-primary">
                  {view.nextRenewal}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Digital ID Card */}
        <div
          className="col-span-12 lg:col-span-4 bg-primary-container text-on-primary-container rounded-xl p-8 shadow-md flex flex-col justify-between overflow-hidden relative animate-fade-in-up transition-transform duration-300 hover:-translate-y-0.5"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="absolute -right-12 -bottom-12 w-48 h-48 border-[12px] border-on-primary-container opacity-10 rounded-full" />
          <div>
            <div className="flex justify-between items-start mb-8">
              <h3 className="font-headline-md text-headline-md">Zentriva ID</h3>
              <span className="material-symbols-outlined text-[32px]">contactless</span>
            </div>
            <div className="space-y-4">
              <div className="h-40 bg-surface-container-lowest/10 rounded flex items-center justify-center border border-on-primary-container/20">
                <div className="bg-white p-2 rounded-lg">
                  <QrVerificationCode value={qrValue} size={112} label="Membership QR code" />
                </div>
              </div>
              <p className="font-label-md text-label-md tracking-widest opacity-60">
                {view.membershipId}
              </p>
            </div>
          </div>
          <Link
            to="/member/id"
            className="block text-center bg-transparent text-on-primary-container mt-6 w-full py-3 border border-on-primary-container/40 rounded-lg font-label-md text-label-md hover:bg-on-primary-container/10 transition-colors no-underline"
          >
            View Full Membership ID
          </Link>
        </div>

        {/* Quick Benefits */}
        <div
          className="col-span-12 lg:col-span-7 space-y-6 animate-fade-in-up"
          style={{ animationDelay: '0.2s' }}
        >
          <h3 className="font-headline-md text-headline-md text-primary">Quick Benefits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickBenefits.map((benefit) => (
              <div
                key={benefit.title}
                className="p-6 bg-surface-container-lowest border border-outline-variant rounded-xl hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
              >
                <span className="material-symbols-outlined text-primary mb-4 block">
                  {benefit.icon}
                </span>
                <h4 className="font-label-md text-label-md text-primary mb-1">
                  {benefit.title}
                </h4>
                <p className="font-label-sm text-label-sm text-secondary">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment activity / next event */}
        <div
          className="col-span-12 lg:col-span-5 bg-surface-container-low rounded-xl p-8 border border-outline-variant animate-fade-in-up"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-md text-headline-md text-primary">Recent Payments</h3>
            <Link className="font-label-sm text-label-sm text-primary hover:underline" to="/member/billing">
              View All
            </Link>
          </div>
          <div className="space-y-6">
            {payments === null && (
              <p className="font-label-sm text-label-sm text-secondary animate-pulse">Loading payments…</p>
            )}
            {payments !== null && payments.length === 0 && (
              <p className="font-label-sm text-label-sm text-secondary">
                No payment records yet.
              </p>
            )}
            {(payments || []).slice(0, 3).map((payment) => (
              <div key={payment.id} className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-tertiary-container flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-on-tertiary-container text-[20px]">
                    payments
                  </span>
                </div>
                <div>
                  <p className="font-label-md text-label-md text-primary capitalize">
                    {payment.description || 'Payment'} — ₦{((payment.amount_kobo || 0) / 100).toLocaleString()}
                  </p>
                  <p className="font-label-sm text-label-sm text-secondary">
                    {formatShortDate(parseDbDate(payment.paid_at || payment.created_at))} • {payment.status}
                  </p>
                </div>
              </div>
            ))}

            {nextEvent && (
              <div className="mt-8 pt-8 border-t border-outline-variant">
                <h4 className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-4">
                  Upcoming Event
                </h4>
                <div className="bg-surface-container-lowest p-4 rounded-lg border border-outline-variant flex items-center gap-4">
                  <div className="text-center px-3 border-r border-outline-variant">
                    <span className="material-symbols-outlined text-primary">{nextEvent.icon}</span>
                    <p className="text-label-sm text-secondary font-label-sm mt-1">{nextEvent.date}</p>
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-primary">{nextEvent.title}</p>
                    <p className="font-label-sm text-label-sm text-secondary">{nextEvent.description}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Overview;
