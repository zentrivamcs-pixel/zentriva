import React, { useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { getTier } from '../shared/membershipTiers';
import { formatDate, searchableText, PAYMENT_STATUS_LABELS } from './adminHelpers';

const nairaFmt = (n) => `₦${Math.round(n).toLocaleString('en-NG')}`;

const METHOD_LABELS = {
  bank_transfer: 'Bank Transfer',
  paystack: 'Paystack',
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
];

const METHOD_FILTERS = [
  { value: 'all', label: 'All methods' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'paystack', label: 'Paystack' },
];

// Every member carries exactly one registration transaction (payment_method
// / payment_status / payment_reference / payment_proof_url) — there is no
// separate transactions table to join against yet, so this page derives its
// rows from the same member list every other admin page already has loaded.
function AdminTransactions() {
  const { members, loading, handlePaymentDecision } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');

  const statusFilter = searchParams.get('status') || 'all';
  const methodFilter = searchParams.get('method') || 'all';

  const setStatusFilter = (value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === 'all') next.delete('status'); else next.set('status', value);
      return next;
    });
  };

  const setMethodFilter = (value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === 'all') next.delete('method'); else next.set('method', value);
      return next;
    });
  };

  const transactions = useMemo(() => (
    members
      .filter((m) => !!m.payment_method)
      .map((m) => ({ member: m, amountNaira: getTier(m.membership_tier).priceNaira }))
      .sort((a, b) => new Date(b.member.created_at || 0) - new Date(a.member.created_at || 0))
  ), [members]);

  const pendingCount = useMemo(
    () => transactions.filter((t) => t.member.payment_status === 'pending_review').length,
    [transactions]
  );
  const pendingTotal = useMemo(
    () => transactions
      .filter((t) => t.member.payment_status === 'pending_review')
      .reduce((sum, t) => sum + t.amountNaira, 0),
    [transactions]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter(({ member }) => {
      if (statusFilter !== 'all' && member.payment_status !== statusFilter) return false;
      if (methodFilter !== 'all' && member.payment_method !== methodFilter) return false;
      if (q && !searchableText(member).includes(q) && !(member.payment_reference || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [transactions, statusFilter, methodFilter, search]);

  if (loading) {
    return <p className="text-on-surface-variant text-body-md">Loading transactions…</p>;
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">Transactions</h2>
          <p className="text-on-surface-variant text-body-md">
            Every membership registration payment — approve or reject bank transfers awaiting review.
          </p>
        </div>
      </div>

      {pendingCount > 0 && (
        <section className="mt-gutter bg-tertiary-container text-on-tertiary-container p-5 rounded-xl border border-outline-variant shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined">pending_actions</span>
            <p className="text-body-md">
              <strong>{pendingCount}</strong> bank transfer{pendingCount === 1 ? '' : 's'} awaiting approval
              — <strong>{nairaFmt(pendingTotal)}</strong> total.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('pending_review')}
            className="px-4 py-2 bg-on-tertiary-container text-tertiary-container rounded-lg text-label-sm font-bold hover:opacity-90 transition-opacity"
          >
            Review Now
          </button>
        </section>
      )}

      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden mt-gutter">
        <div className="p-6 border-b border-outline-variant flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="relative flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, or reference…"
              className="w-full pl-10 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-label-md focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {STATUS_FILTERS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-label-md focus:ring-2 focus:ring-primary focus:outline-none"
            >
              {METHOD_FILTERS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-md">
              <tr>
                <th className="px-6 py-4 font-semibold">Member</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Method</th>
                <th className="px-6 py-4 font-semibold">Reference</th>
                <th className="px-6 py-4 font-semibold text-right">Amount</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Proof</th>
                <th className="px-6 py-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-on-surface-variant">
                    No transactions match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map(({ member, amountNaira }) => {
                  const status = PAYMENT_STATUS_LABELS[member.payment_status] || PAYMENT_STATUS_LABELS.pending_review;
                  const isPending = member.payment_status === 'pending_review';
                  return (
                    <tr key={member.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-on-surface">{member.full_name}</p>
                        <p className="text-label-sm text-on-surface-variant">{member.email}</p>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">{formatDate(member.created_at)}</td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {METHOD_LABELS[member.payment_method] || member.payment_method}
                      </td>
                      <td className="px-6 py-4 text-label-sm text-on-surface-variant font-mono">
                        {member.payment_reference || '—'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-on-surface whitespace-nowrap">
                        {nairaFmt(amountNaira)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-label-sm font-bold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {member.payment_proof_url ? (
                          <a
                            href={member.payment_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-label-sm hover:underline"
                          >
                            View
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        {isPending ? (
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handlePaymentDecision(member, 'approve')}
                              className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-label-sm hover:opacity-90 transition-opacity"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePaymentDecision(member, 'reject')}
                              className="px-3 py-1.5 border border-error/40 text-error rounded-lg text-label-sm hover:bg-error/10 transition-colors bg-transparent"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <p className="text-center text-label-sm text-outline">—</p>
                        )}
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

export default AdminTransactions;
