import React, { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { getTier } from '../shared/membershipTiers';
import { countWhere, formatDate, buildMembersFilterUrl, PAYMENT_STATUS_LABELS } from './adminHelpers';
import { CHART_COLORS } from './AdminPieChart';

const nairaFmt = (n) => `₦${Math.round(n).toLocaleString('en-NG')}`;

const tierLabel = (key) => getTier(key).name;

const initials = (name) => (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

const KpiCard = ({ icon, iconBg, iconColor, label, value, subtext, to }) => {
  const card = (
    <>
      <div className={`inline-flex p-2 rounded-lg mb-4 ${iconBg}`}>
        <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
      </div>
      <p className="text-on-surface-variant text-label-md">{label}</p>
      <h3 className="text-headline-md font-bold text-primary mt-1">{value}</h3>
      <p className="text-label-sm text-outline mt-2">{subtext}</p>
    </>
  );
  const className = 'bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow';
  return to ? (
    <Link to={to} className={`${className} block no-underline`}>{card}</Link>
  ) : (
    <div className={className}>{card}</div>
  );
};

const MiniStat = ({ icon, label, value, total, to }) => {
  const stat = (
    <>
      <div className="p-2 bg-surface-container-high rounded-lg flex-shrink-0">
        <span className="material-symbols-outlined text-primary">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-headline-md font-bold text-primary">{value}</p>
        <p className="text-label-sm text-on-surface-variant leading-snug">
          {label} · {total ? Math.round((value / total) * 100) : 0}%
        </p>
      </div>
    </>
  );
  const className = 'bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow';
  return to ? (
    <Link to={to} className={`${className} no-underline`}>{stat}</Link>
  ) : (
    <div className={className}>{stat}</div>
  );
};

// Monthly paid contributions for the last `monthsBack` months, oldest first —
// same bucketing shape as adminHelpers.monthlySignups but summing naira
// instead of counting registrations.
const monthlyContributions = (members, monthsBack = 6) => {
  const now = new Date();
  const buckets = [];
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en-US', { month: 'short' }), amount: 0 });
  }
  const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
  members.forEach((m) => {
    if (m.payment_status !== 'paid' || !m.created_at) return;
    const d = new Date(m.created_at);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (byKey[key]) byKey[key].amount += getTier(m.membership_tier).priceNaira;
  });
  return buckets;
};

function AdminFinances() {
  const { members, loading } = useOutletContext();

  const financials = useMemo(() => {
    let totalPaid = 0;
    let totalPending = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    const byTier = {};

    members.forEach((m) => {
      const price = getTier(m.membership_tier).priceNaira;
      if (m.payment_status === 'paid') {
        totalPaid += price;
        paidCount += 1;
        const key = m.membership_tier || 'standard';
        byTier[key] = byTier[key] || { amount: 0, count: 0 };
        byTier[key].amount += price;
        byTier[key].count += 1;
      } else if (m.payment_status === 'pending_review') {
        totalPending += price;
        pendingCount += 1;
      } else if (m.payment_status === 'rejected') {
        rejectedCount += 1;
      }
    });

    return { totalPaid, totalPending, paidCount, pendingCount, rejectedCount, byTier };
  }, [members]);

  const growth = useMemo(() => monthlyContributions(members, 6), [members]);
  const growthMax = Math.max(1, ...growth.map((b) => b.amount));

  const tierBreakdown = useMemo(
    () => Object.entries(financials.byTier).sort((a, b) => b[1].amount - a[1].amount),
    [financials.byTier]
  );
  const tierMax = Math.max(1, financials.totalPaid);

  const paymentMethods = useMemo(() => ({
    paystack: countWhere(members, 'payment_method', 'paystack'),
    bankTransfer: countWhere(members, 'payment_method', 'bank_transfer'),
  }), [members]);

  const outstandingByTier = useMemo(() => {
    const groups = {};
    members.filter((m) => m.payment_status === 'pending_review').forEach((m) => {
      const key = m.membership_tier || 'standard';
      groups[key] = groups[key] || { members: [], total: 0 };
      groups[key].members.push(m);
      groups[key].total += getTier(key).priceNaira;
    });
    return Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
  }, [members]);

  const recentLedger = useMemo(() => (
    [...members]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 8)
  ), [members]);

  const remindDefaulters = (group) => {
    const emails = group.members.map((m) => m.email).filter(Boolean).join(',');
    const subject = encodeURIComponent('Zentriva Cooperative — Outstanding Membership Dues');
    const body = encodeURIComponent(
      'Hello,\n\nOur records show your membership payment is still pending review. ' +
      'Please complete your payment or reach out if you have already paid.\n\nZentriva Admin'
    );
    window.location.href = `mailto:?bcc=${emails}&subject=${subject}&body=${body}`;
  };

  const total = members.length;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

  if (loading) {
    return <p className="text-on-surface-variant text-body-md">Loading financials…</p>;
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">Financial Management</h2>
          <p className="text-on-surface-variant text-body-md">Membership contributions and outstanding dues.</p>
        </div>
        <Link
          to="/admin/members"
          className="px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md flex items-center gap-2 hover:opacity-90 transition-opacity no-underline"
        >
          <span className="material-symbols-outlined">group</span>
          Browse Members
        </Link>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mt-gutter">
        <KpiCard
          icon="account_balance_wallet"
          iconBg="bg-secondary-container"
          iconColor="text-on-secondary-container"
          label="Total Contributions"
          value={nairaFmt(financials.totalPaid)}
          subtext={`${financials.paidCount} paid registrations`}
          to={buildMembersFilterUrl('payment_status', 'paid')}
        />
        <KpiCard
          icon="pending_actions"
          iconBg="bg-tertiary-fixed"
          iconColor="text-on-tertiary-fixed-variant"
          label="Outstanding Dues"
          value={nairaFmt(financials.totalPending)}
          subtext={`${financials.pendingCount} pending review${financials.rejectedCount ? ` · ${financials.rejectedCount} rejected` : ''}`}
          to={buildMembersFilterUrl('payment_status', 'pending_review')}
        />
        <KpiCard
          icon="verified"
          iconBg="bg-primary-fixed"
          iconColor="text-on-primary-fixed"
          label="Paid Members"
          value={financials.paidCount}
          subtext={`${pct(financials.paidCount)}% of total membership`}
          to={buildMembersFilterUrl('payment_status', 'paid')}
        />
        <KpiCard
          icon="payments"
          iconBg="bg-error-container"
          iconColor="text-on-error-container"
          label="Avg. Contribution"
          value={nairaFmt(financials.paidCount ? financials.totalPaid / financials.paidCount : 0)}
          subtext="Per paid member"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mt-gutter">
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h4 className="font-headline-md text-primary">Monthly Contributions</h4>
              <p className="text-on-surface-variant text-label-md">Paid dues collected (last 6 months)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-primary rounded-full" />
              <span className="text-label-sm">Contributions</span>
            </div>
          </div>
          {growthMax <= 1 && growth.every((b) => b.amount === 0) ? (
            <p className="text-on-surface-variant text-body-md text-center py-16">No contributions recorded yet.</p>
          ) : (
            <div className="h-64 flex items-end justify-between gap-4 px-2 border-b border-outline-variant">
              {growth.map((bucket) => (
                <div key={bucket.key} className="flex-1 flex flex-col items-center gap-1 group h-full">
                  <div className="w-full flex items-end h-full">
                    <div
                      className="w-full bg-primary/70 rounded-t group-hover:bg-primary transition-all"
                      style={{ height: `${Math.max(4, (bucket.amount / growthMax) * 100)}%` }}
                      title={nairaFmt(bucket.amount)}
                    />
                  </div>
                  <span className="text-label-sm text-outline mt-2">{bucket.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm flex flex-col">
          <h4 className="font-headline-md text-primary mb-1">Contributions by Tier</h4>
          <p className="text-on-surface-variant text-label-md mb-6">Paid revenue breakdown</p>
          {tierBreakdown.length === 0 ? (
            <p className="text-on-surface-variant text-body-md text-center py-10">No paid contributions yet</p>
          ) : (
            <div className="space-y-5 flex-1">
              {tierBreakdown.map(([key, { amount, count }], i) => (
                <Link
                  key={key}
                  to={buildMembersFilterUrl('membership_tier', key)}
                  className="block no-underline group"
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-body-md text-on-surface flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {tierLabel(key)}
                      <span className="text-label-sm text-on-surface-variant">({count})</span>
                    </span>
                    <span className="font-bold text-primary text-label-md">{nairaFmt(amount)}</span>
                  </div>
                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full group-hover:opacity-80 transition-opacity"
                      style={{ width: `${Math.max(4, (amount / tierMax) * 100)}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-gutter mt-gutter">
        <MiniStat
          icon="credit_card"
          label="Paid via Paystack"
          value={paymentMethods.paystack}
          total={financials.paidCount + financials.pendingCount}
          to={buildMembersFilterUrl('payment_method', 'paystack')}
        />
        <MiniStat
          icon="account_balance"
          label="Paid via Bank Transfer"
          value={paymentMethods.bankTransfer}
          total={financials.paidCount + financials.pendingCount}
          to={buildMembersFilterUrl('payment_method', 'bank_transfer')}
        />
      </section>

      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden mt-gutter">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center">
          <h4 className="font-headline-md text-primary">Outstanding Member Dues</h4>
          <Link to={buildMembersFilterUrl('payment_status', 'pending_review')} className="text-primary text-label-sm font-bold no-underline hover:underline flex items-center gap-1">
            View All <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-md">
              <tr>
                <th className="px-6 py-4 font-semibold">Tier</th>
                <th className="px-6 py-4 font-semibold text-right">Total Debt</th>
                <th className="px-6 py-4 font-semibold">Defaulters</th>
                <th className="px-6 py-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {outstandingByTier.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-on-surface-variant">
                    No outstanding dues — every registration is paid or resolved.
                  </td>
                </tr>
              ) : (
                outstandingByTier.map(([key, group]) => (
                  <tr key={key} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-body-md font-bold text-on-surface">{tierLabel(key)}</p>
                      <p className="text-label-sm text-on-surface-variant">{group.members.length} member{group.members.length === 1 ? '' : 's'}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-error">{nairaFmt(group.total)}</td>
                    <td className="px-6 py-4">
                      <div className="flex -space-x-2">
                        {group.members.slice(0, 3).map((m) => (
                          <div key={m.id} title={m.full_name} className="w-8 h-8 rounded-full border-2 border-white bg-secondary-container flex items-center justify-center text-[10px] font-bold text-on-secondary-container">
                            {initials(m.full_name)}
                          </div>
                        ))}
                        {group.members.length > 3 && (
                          <div className="w-8 h-8 rounded-full border-2 border-white bg-primary-container flex items-center justify-center text-[10px] font-bold text-on-primary">
                            +{group.members.length - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => remindDefaulters(group)}
                        className="px-4 py-2 bg-primary-container text-white text-label-sm rounded-lg hover:bg-opacity-90 transition-all active:scale-95"
                      >
                        Send Reminders
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden mt-gutter">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center">
          <h4 className="font-headline-md text-primary">Recent Contributions</h4>
          <Link to="/admin/members" className="text-primary text-label-sm font-bold no-underline hover:underline">
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-md">
              <tr>
                <th className="px-6 py-4 font-semibold">Member</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Tier</th>
                <th className="px-6 py-4 font-semibold text-right">Amount</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {recentLedger.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-on-surface-variant">
                    No contributions recorded yet.
                  </td>
                </tr>
              ) : (
                recentLedger.map((m) => {
                  const status = PAYMENT_STATUS_LABELS[m.payment_status] || PAYMENT_STATUS_LABELS.pending_review;
                  return (
                    <tr key={m.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[11px]">
                            {initials(m.full_name)}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface">{m.full_name}</p>
                            <p className="text-label-sm text-on-surface-variant">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">{formatDate(m.created_at)}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{tierLabel(m.membership_tier)}</td>
                      <td className="px-6 py-4 text-right font-bold text-on-surface">{nairaFmt(getTier(m.membership_tier).priceNaira)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-label-sm ${status.className}`}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default AdminFinances;
