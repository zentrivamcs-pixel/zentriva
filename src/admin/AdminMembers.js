import React, { useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { exportDirectoryPdf } from './exportDirectoryPdf';
import { tallyScalar, tallyArray, searchableText, ARRAY_FIELDS, FIELD_LABELS, PAYMENT_STATUS_LABELS } from './adminHelpers';

function AdminMembers() {
  const { members, loading, setViewing, openEdit, handleDelete } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pdfLoading, setPdfLoading] = useState(false);

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [filterSkill, setFilterSkill] = useState('');
  const [filterProfession, setFilterProfession] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterGender, setFilterGender] = useState('');

  // Set when arriving from a Dashboard card/chart (e.g. the "Executive
  // Members" KPI or a pie slice) — a field+value pair identifying exactly
  // which members that number/segment represents.
  const fieldFilter = searchParams.get('field');
  const valueFilter = searchParams.get('value');

  const skills = useMemo(() => tallyArray(members, 'skills').map(([s]) => s), [members]);
  const professions = useMemo(() => tallyScalar(members, 'profession').map(([p]) => p), [members]);
  const categories = useMemo(() => tallyArray(members, 'offer_category').map(([c]) => c), [members]);

  const term = search.trim().toLowerCase();
  const filteredMembers = useMemo(() => members.filter((m) => {
    if (term && !searchableText(m).includes(term)) return false;
    if (filterSkill && !(m.skills || []).includes(filterSkill)) return false;
    if (filterProfession && m.profession !== filterProfession) return false;
    if (filterCategory && !(m.offer_category || []).includes(filterCategory)) return false;
    if (filterGender && m.gender !== filterGender) return false;
    if (fieldFilter && valueFilter) {
      const fieldValue = m[fieldFilter];
      const matches = ARRAY_FIELDS.includes(fieldFilter)
        ? (fieldValue || []).includes(valueFilter)
        : fieldValue === valueFilter;
      if (!matches) return false;
    }
    return true;
  }), [members, term, filterSkill, filterProfession, filterCategory, filterGender, fieldFilter, valueFilter]);

  const clearFieldFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('field');
    next.delete('value');
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearch(''); setFilterSkill(''); setFilterProfession('');
    setFilterCategory(''); setFilterGender('');
    clearFieldFilter();
  };
  const hasFilters = term || filterSkill || filterProfession || filterCategory || filterGender || (fieldFilter && valueFilter);

  if (loading) {
    return <p className="text-on-surface-variant text-body-md">Loading members…</p>;
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-gutter">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">Members</h2>
          <p className="text-on-surface-variant text-body-md">Search, filter, and manage the membership directory.</p>
        </div>
      </div>

      {fieldFilter && valueFilter && (
        <div className="mb-gutter flex items-center gap-2 flex-wrap">
          <span className="text-label-sm text-on-surface-variant">Filtering by:</span>
          <span className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-secondary-container text-on-secondary-container rounded-full text-label-sm">
            {FIELD_LABELS[fieldFilter] || fieldFilter}: <strong>{valueFilter}</strong>
            <button
              type="button"
              onClick={clearFieldFilter}
              aria-label="Clear this filter"
              className="bg-transparent p-0.5 hover:opacity-70 transition-opacity"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </span>
        </div>
      )}

      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="p-6 border-b border-outline-variant flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search name, email, profession, business…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <select
            value={filterSkill}
            onChange={(e) => setFilterSkill(e.target.value)}
            className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-label-md"
          >
            <option value="">All Skills</option>
            {skills.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterProfession}
            onChange={(e) => setFilterProfession(e.target.value)}
            className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-label-md"
          >
            <option value="">All Professions</option>
            {professions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-label-md"
          >
            <option value="">All Offer Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-label-md"
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2 border border-outline-variant rounded-lg text-label-md hover:bg-surface-container-low transition-colors"
            >
              Clear
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            disabled={pdfLoading}
            onClick={async () => {
              setPdfLoading(true);
              try {
                await exportDirectoryPdf(filteredMembers);
              } finally {
                setPdfLoading(false);
              }
            }}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            {pdfLoading ? 'Preparing…' : 'Export PDF'}
          </button>
        </div>

        <p className="px-6 pt-4 text-label-sm text-on-surface-variant">
          Showing {filteredMembers.length} of {members.length} members
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-md">
              <tr>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Tier</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Gender</th>
                <th className="px-6 py-4 font-semibold">Profession / Business</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Skills</th>
                <th className="px-6 py-4 font-semibold">Categories</th>
                <th className="px-6 py-4 font-semibold">Payment</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-8 text-center text-on-surface-variant">
                    {hasFilters ? 'No members match your filters.' : 'No members registered yet.'}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-on-surface">{m.full_name}</td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {m.membership_tier ? m.membership_tier[0].toUpperCase() + m.membership_tier.slice(1) : '—'}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{m.membership_category || '—'}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{m.gender || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="text-on-surface">{m.profession || '—'}</div>
                      {m.business_name && <div className="text-label-sm text-on-surface-variant">{m.business_name}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-on-surface">{m.phone_number || '—'}</div>
                      {m.email && <div className="text-label-sm text-on-surface-variant">{m.email}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {(m.skills || []).slice(0, 3).map((s) => (
                          <span key={s} className="px-2 py-0.5 bg-surface-container-high rounded-full text-label-sm">{s}</span>
                        ))}
                        {(m.skills || []).length > 3 && (
                          <span className="px-2 py-0.5 bg-surface-container-high rounded-full text-label-sm">
                            +{m.skills.length - 3}
                          </span>
                        )}
                        {(!m.skills || m.skills.length === 0) && <span className="text-on-surface-variant">—</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {(m.offer_category || []).map((c) => (
                          <span key={c} className="px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-full text-label-sm">
                            {c}
                          </span>
                        ))}
                        {(!m.offer_category || m.offer_category.length === 0) && <span className="text-on-surface-variant">—</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const status = PAYMENT_STATUS_LABELS[m.payment_status];
                        return status ? (
                          <span className={`px-2 py-0.5 rounded-full text-label-sm font-bold ${status.className}`}>
                            {status.label}
                          </span>
                        ) : <span className="text-on-surface-variant">—</span>;
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="View"
                          onClick={() => setViewing(m)}
                          className="bg-transparent p-2 text-on-tertiary-fixed-variant hover:bg-tertiary-fixed/30 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEdit(m)}
                          className="bg-transparent p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => handleDelete(m)}
                          className="bg-transparent p-2 text-error hover:bg-error-container/30 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default AdminMembers;
