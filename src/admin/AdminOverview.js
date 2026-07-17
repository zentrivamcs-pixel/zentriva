import React, { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { exportDirectoryPdf } from './exportDirectoryPdf';
import { countWhere, tallyScalar, tallyArray, monthlySignups, formatDate, buildMembersFilterUrl } from './adminHelpers';
import AdminPieChart from './AdminPieChart';
import AdminBarChart from './AdminBarChart';

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

const CategoryBadge = ({ category }) => {
  if (!category) return <span className="text-on-surface-variant">—</span>;
  const isExecutive = category.startsWith('Executive');
  return (
    <span
      className={`px-3 py-1 rounded-full text-label-sm ${
        isExecutive ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-highest text-on-surface-variant'
      }`}
    >
      {category}
    </span>
  );
};

function AdminOverview() {
  const { members, loading, setViewing, openEdit } = useOutletContext();
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleExportPdf = async () => {
    setPdfLoading(true);
    try {
      await exportDirectoryPdf(members);
    } finally {
      setPdfLoading(false);
    }
  };

  const analytics = useMemo(() => ({
    total: members.length,
    executives: countWhere(members, 'membership_category', 'Executive Member'),
    nonExecutives: countWhere(members, 'membership_category', 'Non-Executive Member'),
    businessOwners: countWhere(members, 'owns_business', 'Yes'),
  }), [members]);

  const growth = useMemo(() => monthlySignups(members, 6), [members]);
  const growthMax = Math.max(1, ...growth.map((b) => b.count));

  // Registration-field breakdowns, computed once per members change.
  const genderData = useMemo(() => tallyScalar(members, 'gender'), [members]);
  const categoryData = useMemo(() => tallyScalar(members, 'membership_category'), [members]);
  const tierData = useMemo(() => tallyScalar(members, 'membership_tier'), [members]);
  const ownsBusinessData = useMemo(() => tallyScalar(members, 'owns_business'), [members]);

  const skillsData = useMemo(() => tallyArray(members, 'skills'), [members]);
  const professionsData = useMemo(() => tallyScalar(members, 'profession'), [members]);
  const offerCategoryData = useMemo(() => tallyArray(members, 'offer_category'), [members]);
  const employmentData = useMemo(() => tallyArray(members, 'employment_status'), [members]);
  const servicesNeededData = useMemo(() => tallyArray(members, 'services_needed'), [members]);

  const scoreCards = useMemo(() => ({
    mentors: countWhere(members, 'willing_to_mentor', 'Yes'),
    speakers: countWhere(members, 'available_to_speak', 'Yes'),
    partnerships: countWhere(members, 'open_to_partnerships', 'Yes'),
    discounts: countWhere(members, 'offer_discounts', 'Yes'),
    employers: countWhere(members, 'employs_staff', 'Yes'),
  }), [members]);

  const recentMembers = useMemo(() => (
    [...members]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5)
  ), [members]);

  const pct = (n) => (analytics.total ? Math.round((n / analytics.total) * 100) : 0);

  if (loading) {
    return <p className="text-on-surface-variant text-body-md">Loading dashboard…</p>;
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">Executive Dashboard</h2>
          <p className="text-on-surface-variant text-body-md">Overview of Zentriva Cooperative Society operations.</p>
        </div>
        <button
          type="button"
          disabled={pdfLoading}
          onClick={handleExportPdf}
          className="px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          <span className="material-symbols-outlined">download</span>
          {pdfLoading ? 'Preparing…' : 'Export PDF'}
        </button>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mt-gutter">
        <KpiCard
          icon="group"
          iconBg="bg-secondary-container"
          iconColor="text-on-secondary-container"
          label="Total Members"
          value={analytics.total}
          subtext="All-time verified registrations"
          to="/admin/members"
        />
        <KpiCard
          icon="work"
          iconBg="bg-primary-fixed"
          iconColor="text-on-primary-fixed"
          label="Executive Members"
          value={analytics.executives}
          subtext={`${pct(analytics.executives)}% of total membership`}
          to={buildMembersFilterUrl('membership_category', 'Executive Member')}
        />
        <KpiCard
          icon="groups"
          iconBg="bg-tertiary-fixed"
          iconColor="text-on-tertiary-fixed-variant"
          label="Non-Executive Members"
          value={analytics.nonExecutives}
          subtext={`${pct(analytics.nonExecutives)}% of total membership`}
          to={buildMembersFilterUrl('membership_category', 'Non-Executive Member')}
        />
        <KpiCard
          icon="storefront"
          iconBg="bg-error-container"
          iconColor="text-on-error-container"
          label="Business Owners"
          value={analytics.businessOwners}
          subtext={`${pct(analytics.businessOwners)}% of total membership`}
          to={buildMembersFilterUrl('owns_business', 'Yes')}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mt-gutter">
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h4 className="font-headline-md text-primary">Membership Growth</h4>
              <p className="text-on-surface-variant text-label-md">New registrations (last 6 months)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-primary rounded-full" />
              <span className="text-label-sm">Registrations</span>
            </div>
          </div>
          {growthMax <= 1 && growth.every((b) => b.count === 0) ? (
            <p className="text-on-surface-variant text-body-md text-center py-16">No registrations yet.</p>
          ) : (
            <div className="h-64 flex items-end justify-between gap-4 px-2 border-b border-outline-variant">
              {growth.map((bucket) => (
                <div key={bucket.key} className="flex-1 flex flex-col items-center gap-1 group h-full">
                  <div className="w-full flex items-end h-full">
                    <div
                      className="w-full bg-primary/70 rounded-t group-hover:bg-primary transition-all"
                      style={{ height: `${Math.max(4, (bucket.count / growthMax) * 100)}%` }}
                      title={`${bucket.count} registrations`}
                    />
                  </div>
                  <span className="text-label-sm text-outline mt-2">{bucket.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-primary-container p-8 rounded-xl shadow-lg flex flex-col text-on-primary">
          <h4 className="font-headline-md mb-6 border-b border-outline-variant/20 pb-4">Quick Actions</h4>
          <div className="space-y-4">
            <button
              type="button"
              disabled={pdfLoading}
              onClick={handleExportPdf}
              className="w-full bg-surface-container-lowest/10 hover:bg-surface-container-lowest/20 p-4 rounded-lg flex items-center gap-4 transition-colors group disabled:opacity-60 text-on-primary"
            >
              <div className="p-2 bg-secondary-fixed text-on-secondary-fixed rounded-lg group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">description</span>
              </div>
              <div className="text-left">
                <p className="font-label-md text-label-md">{pdfLoading ? 'Preparing…' : 'Export Directory PDF'}</p>
                <p className="text-label-sm text-on-primary-container">Full member list, one page per entry</p>
              </div>
            </button>

            <Link
              to="/admin/members"
              className="w-full bg-surface-container-lowest/10 hover:bg-surface-container-lowest/20 p-4 rounded-lg flex items-center gap-4 transition-colors group no-underline text-on-primary"
            >
              <div className="p-2 bg-tertiary-fixed text-on-tertiary-fixed rounded-lg group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">group</span>
              </div>
              <div className="text-left">
                <p className="font-label-md text-label-md">Browse All Members</p>
                <p className="text-label-sm text-on-primary-container">Search, filter, and edit records</p>
              </div>
            </Link>

            <a
              href="/register"
              target="_blank"
              rel="noreferrer"
              className="w-full bg-surface-container-lowest/10 hover:bg-surface-container-lowest/20 p-4 rounded-lg flex items-center gap-4 transition-colors group no-underline text-on-primary"
            >
              <div className="p-2 bg-primary-fixed text-on-primary-fixed rounded-lg group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">person_add</span>
              </div>
              <div className="text-left">
                <p className="font-label-md text-label-md">New Registration</p>
                <p className="text-label-sm text-on-primary-container">Opens the public sign-up form</p>
              </div>
            </a>
          </div>
          <div className="mt-auto pt-8">
            <div className="bg-surface-container-lowest/5 p-4 rounded-lg border border-outline-variant/10 italic text-label-sm text-on-primary-container">
              Edits and deletions here take effect immediately and cannot be undone. Double-check before saving.
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden mt-gutter">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center">
          <h4 className="font-headline-md text-primary">Recent Members</h4>
          <div className="flex gap-2 items-center">
            <span className="text-label-sm px-3 py-1 bg-surface-container-low rounded-full text-on-surface-variant">
              Showing {recentMembers.length} of {members.length}
            </span>
            <Link to="/admin/members" className="text-primary text-label-sm font-bold no-underline hover:underline">
              View All
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low text-on-surface-variant font-label-md">
              <tr>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Date Submitted</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Tier</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {recentMembers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-on-surface-variant">
                    No members registered yet.
                  </td>
                </tr>
              ) : (
                recentMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {(m.full_name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">{m.full_name}</p>
                          <p className="text-label-sm text-on-surface-variant">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{formatDate(m.created_at)}</td>
                    <td className="px-6 py-4"><CategoryBadge category={m.membership_category} /></td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {m.membership_tier ? m.membership_tier[0].toUpperCase() + m.membership_tier.slice(1) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewing(m)}
                          title="View"
                          className="bg-transparent p-2 text-on-tertiary-fixed-variant hover:bg-tertiary-fixed/30 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          title="Edit"
                          className="bg-transparent p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined">edit</span>
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

      <section className="mt-gutter">
        <h3 className="font-headline-md text-headline-md text-primary mb-1">Registration Insights</h3>
        <p className="text-on-surface-variant text-body-md mb-6">
          How members answered every field on the registration form.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-gutter">
          <AdminPieChart title="Gender" data={genderData} field="gender" />
          <AdminPieChart
            title="Membership Category"
            data={categoryData}
            field="membership_category"
            formatLabel={(v) => v.replace(' Member', '')}
          />
          <AdminPieChart
            title="Membership Tier"
            data={tierData}
            field="membership_tier"
            formatLabel={(v) => v[0].toUpperCase() + v.slice(1)}
          />
          <AdminPieChart title="Owns a Business" data={ownsBusinessData} field="owns_business" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-gutter mb-gutter">
          <MiniStat
            icon="school"
            label="Willing to Mentor"
            value={scoreCards.mentors}
            total={analytics.total}
            to={buildMembersFilterUrl('willing_to_mentor', 'Yes')}
          />
          <MiniStat
            icon="mic"
            label="Available to Speak"
            value={scoreCards.speakers}
            total={analytics.total}
            to={buildMembersFilterUrl('available_to_speak', 'Yes')}
          />
          <MiniStat
            icon="handshake"
            label="Open to Partnerships"
            value={scoreCards.partnerships}
            total={analytics.total}
            to={buildMembersFilterUrl('open_to_partnerships', 'Yes')}
          />
          <MiniStat
            icon="local_offer"
            label="Offer Discounts"
            value={scoreCards.discounts}
            total={analytics.total}
            to={buildMembersFilterUrl('offer_discounts', 'Yes')}
          />
          <MiniStat
            icon="badge"
            label="Employ Staff"
            value={scoreCards.employers}
            total={analytics.total}
            to={buildMembersFilterUrl('employs_staff', 'Yes')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          <AdminBarChart title="Top Skills" data={skillsData} field="skills" color="#2a78d6" />
          <AdminBarChart title="Top Professions" data={professionsData} field="profession" color="#008300" />
          <AdminBarChart title="Offer Categories" data={offerCategoryData} field="offer_category" color="#e87ba4" />
          <AdminBarChart title="Employment Status" data={employmentData} field="employment_status" color="#eda100" />
          <AdminBarChart title="Most Needed Services" data={servicesNeededData} field="services_needed" color="#1baf7a" />
        </div>
      </section>
    </>
  );
}

export default AdminOverview;
