import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { memberApi } from '../shared/api';

// Strips a phone number down to digits for a wa.me link.
const waLink = (phone) => `https://wa.me/${String(phone).replace(/[^\d]/g, '')}`;

const initials = (name) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

function matchesQuery(entry, query) {
  if (!query) return true;
  const haystack = [
    entry.full_name, entry.profession, entry.job_title, entry.company_name,
    entry.business_name, entry.business_type, entry.products_services,
    entry.business_location, ...(entry.skills || []), ...(entry.offer_category || []),
  ].filter(Boolean).join(' ').toLowerCase();
  return query.toLowerCase().split(/\s+/).every((term) => haystack.includes(term));
}

function DirectoryCard({ entry }) {
  const skills = entry.skills || [];
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
          {initials(entry.full_name)}
        </div>
        <div className="min-w-0">
          <h3 className="font-label-md text-label-md font-bold text-primary truncate">{entry.full_name}</h3>
          <p className="font-label-sm text-label-sm text-secondary truncate">
            {[entry.profession || entry.job_title, entry.company_name].filter(Boolean).join(' • ') || 'Member'}
          </p>
        </div>
      </div>

      {(entry.business_name || entry.products_services) && (
        <div className="bg-surface-container-low rounded-lg p-3">
          {entry.business_name && (
            <p className="font-label-md text-label-md text-on-surface font-bold">
              {entry.business_name}
              {entry.business_type ? (
                <span className="font-normal text-secondary"> — {entry.business_type}</span>
              ) : null}
            </p>
          )}
          {entry.products_services && (
            <p className="font-label-sm text-label-sm text-secondary mt-1 line-clamp-2">
              {entry.products_services}
            </p>
          )}
          {entry.business_location && (
            <p className="font-label-sm text-label-sm text-secondary mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              {entry.business_location}
            </p>
          )}
        </div>
      )}

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="px-2.5 py-1 bg-secondary-container text-on-secondary-container rounded-full text-label-sm"
            >
              {skill}
            </span>
          ))}
          {skills.length > 4 && (
            <span className="px-2.5 py-1 bg-surface-container text-secondary rounded-full text-label-sm">
              +{skills.length - 4} more
            </span>
          )}
        </div>
      )}

      {entry.offer_discounts === 'Yes' && (
        <p className="font-label-sm text-label-sm text-on-tertiary-container bg-tertiary-container/40 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">local_offer</span>
          Offers member discounts{entry.discount_details ? `: ${entry.discount_details}` : ''}
        </p>
      )}

      <div className="mt-auto pt-3 border-t border-outline-variant/50 flex flex-wrap gap-2">
        {entry.email && (
          <a
            href={`mailto:${entry.email}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-secondary hover:text-primary hover:border-primary/40 transition-colors font-label-sm text-label-sm no-underline"
          >
            <span className="material-symbols-outlined text-[16px]">mail</span> Email
          </a>
        )}
        {entry.phone_number && (
          <a
            href={`tel:${entry.phone_number}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-secondary hover:text-primary hover:border-primary/40 transition-colors font-label-sm text-label-sm no-underline"
          >
            <span className="material-symbols-outlined text-[16px]">call</span> Call
          </a>
        )}
        {entry.business_phone && (
          <a
            href={waLink(entry.business_phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-secondary hover:text-primary hover:border-primary/40 transition-colors font-label-sm text-label-sm no-underline"
          >
            <span className="material-symbols-outlined text-[16px]">chat</span> WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

// The member-facing business directory — the product the registration form's
// consent checkbox promises. Data comes from /api/me/directory (consented
// members, directory-safe fields only).
function DirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [entries, setEntries] = useState(null); // null = loading
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    memberApi('/api/me/directory')
      .then((data) => { if (!cancelled) setEntries(data); })
      .catch((err) => {
        if (!cancelled) {
          setEntries([]);
          setError(err.message || 'Failed to load the directory');
        }
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(
    () => (entries || []).filter((entry) => matchesQuery(entry, query)),
    [entries, query]
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchParams(value ? { q: value } : {}, { replace: true });
  };

  return (
    <>
      <div className="mb-8">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Member Directory</h2>
        <p className="font-body-md text-body-md text-secondary max-w-2xl">
          Find fellow members to trade with, hire, partner with, or learn from.
          Every member listed here consented to sharing their business details
          for networking and referrals.
        </p>
      </div>

      <div className="mb-6 max-w-xl">
        <div className="flex items-center bg-surface-container-lowest rounded-full px-4 py-2.5 border border-outline-variant focus-within:border-primary/40 transition-colors">
          <span className="material-symbols-outlined text-secondary text-[20px]">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-body-md text-on-surface w-full"
            placeholder="Search by name, skill, business, or location…"
            type="text"
            value={query}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {entries === null ? (
        <p className="text-secondary font-body-md animate-pulse py-12 text-center">Loading directory…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl">
          <span className="material-symbols-outlined text-primary text-[40px] mb-3 block">group_off</span>
          <p className="font-body-md text-body-md text-secondary">
            {error
              ? `Couldn't load the directory: ${error}`
              : query
                ? `No members match “${query}”.`
                : 'No members are listed in the directory yet.'}
          </p>
        </div>
      ) : (
        <>
          <p className="font-label-sm text-label-sm text-secondary mb-4">
            Showing {filtered.length} of {entries.length} member{entries.length === 1 ? '' : 's'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
            {filtered.map((entry) => (
              <DirectoryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default DirectoryPage;
