import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { formatDate } from './adminHelpers';

// Follow-up state for a training application. 'new' is where every row starts;
// the rest are what an admin has done about it.
const STATUS_LABELS = {
  new: { label: 'New', className: 'bg-tertiary-container text-on-tertiary-container' },
  contacted: { label: 'Contacted', className: 'bg-secondary-container text-on-secondary-container' },
  enrolled: { label: 'Enrolled', className: 'bg-primary-container text-on-primary-container' },
  closed: { label: 'Closed', className: 'bg-surface-container-high text-on-surface-variant' },
};

const STATUS_ORDER = ['new', 'contacted', 'enrolled', 'closed'];

// "Learn a Skill" applications from the registration page. These people are
// not members and owe no fee — this page exists so the requests don't pile up
// unseen in a table nobody looks at.
function AdminSkills() {
  const {
    skillApplications, skillsLoading, skillsError,
    setSkillStatus, deleteSkillApplication,
  } = useOutletContext();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('');

  const skills = useMemo(() => {
    const counts = {};
    skillApplications.forEach((a) => { counts[a.skill] = (counts[a.skill] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [skillApplications]);

  const newCount = useMemo(
    () => skillApplications.filter((a) => a.status === 'new').length,
    [skillApplications]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return skillApplications.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (skillFilter && a.skill !== skillFilter) return false;
      if (q) {
        const haystack = [a.full_name, a.phone_number, a.email, a.skill]
          .filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [skillApplications, search, statusFilter, skillFilter]);

  if (skillsLoading) {
    return <p className="text-on-surface-variant text-body-md">Loading skill requests…</p>;
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-gutter">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">Skill Requests</h2>
          <p className="text-on-surface-variant text-body-md">
            Training applications from the registration page. {newCount > 0
              ? `${newCount} still to contact.`
              : 'All caught up.'}
          </p>
        </div>
      </div>

      {skillsError && (
        <p className="mb-gutter p-4 bg-error-container text-on-error-container rounded-lg text-body-md" role="alert">
          {skillsError}
        </p>
      )}

      {skills.length > 0 && (
        <section className="mb-gutter flex flex-wrap gap-2">
          {skills.map(([skill, count]) => (
            <button
              key={skill}
              type="button"
              onClick={() => setSkillFilter(skillFilter === skill ? '' : skill)}
              className={`px-3 py-1.5 rounded-full text-label-sm transition-colors ${
                skillFilter === skill
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              {skill} · {count}
            </button>
          ))}
        </section>
      )}

      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="p-6 border-b border-outline-variant flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search name, phone, email, or skill…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-label-md"
          >
            <option value="all">All statuses</option>
            {STATUS_ORDER.map((value) => (
              <option key={value} value={value}>{STATUS_LABELS[value].label}</option>
            ))}
          </select>
        </div>

        <p className="px-6 pt-4 text-label-sm text-on-surface-variant">
          Showing {filtered.length} of {skillApplications.length} requests
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-md">
              <tr>
                <th className="px-6 py-4 font-semibold">Applicant</th>
                <th className="px-6 py-4 font-semibold">Age / Gender</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Skill</th>
                <th className="px-6 py-4 font-semibold">Received</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-on-surface-variant">
                    {skillApplications.length === 0
                      ? 'No skill training requests yet.'
                      : 'No requests match these filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const status = STATUS_LABELS[a.status] || STATUS_LABELS.new;
                  return (
                    <tr key={a.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-on-surface">{a.full_name}</td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {a.age || '—'} · {a.gender || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <a href={`tel:${a.phone_number}`} className="text-primary no-underline hover:underline">
                          {a.phone_number}
                        </a>
                        {a.email && (
                          <div className="text-label-sm text-on-surface-variant">{a.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-on-surface">{a.skill}</td>
                      <td className="px-6 py-4 text-on-surface-variant whitespace-nowrap">
                        {formatDate(a.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-label-sm font-bold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end items-center gap-2">
                          <select
                            value={a.status}
                            onChange={(e) => setSkillStatus(a, e.target.value)}
                            aria-label={`Set status for ${a.full_name}`}
                            className="px-2 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-label-sm"
                          >
                            {STATUS_ORDER.map((value) => (
                              <option key={value} value={value}>{STATUS_LABELS[value].label}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => deleteSkillApplication(a)}
                            className="bg-transparent p-2 text-error hover:bg-error-container/30 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
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

export default AdminSkills;
