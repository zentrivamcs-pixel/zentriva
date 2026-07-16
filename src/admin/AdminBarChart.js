import React from 'react';
import { Link } from 'react-router-dom';
import { buildMembersFilterUrl } from './adminHelpers';

// Ranked horizontal bars for one field (e.g. Top Skills). A single series —
// one hue for the whole card, per the "compare magnitude" color job — so no
// legend box; the card title already names what's plotted. Value sits at
// the bar's tip rather than inside it, since counts are short and always fit.
//
// Each row links to the Members page filtered to members whose `field`
// includes/equals that row's value — the bar's own detail view.
function AdminBarChart({ title, data, field, limit = 6, color = '#2a78d6' }) {
  const rows = data.slice(0, limit);
  const max = rows.length ? rows[0][1] : 1;

  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
      <h4 className="font-label-md font-bold text-primary mb-4">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-on-surface-variant text-body-md text-center py-6">No data yet</p>
      ) : (
        <div className="space-y-1">
          {rows.map(([label, count]) => {
            const bar = (
              <>
                <span className="w-28 flex-shrink-0 text-label-sm text-on-surface-variant truncate" title={label}>
                  {label}
                </span>
                <div className="flex-1 h-2.5 bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(4, (count / max) * 100)}%`, background: color }}
                  />
                </div>
                <span className="w-6 flex-shrink-0 text-label-sm text-on-surface text-right">{count}</span>
              </>
            );
            return field ? (
              <Link
                key={label}
                to={buildMembersFilterUrl(field, label)}
                title={`${label}: ${count} — view members`}
                className="flex items-center gap-3 no-underline -mx-1 px-1 py-1.5 rounded hover:bg-surface-container-low transition-colors"
              >
                {bar}
              </Link>
            ) : (
              <div key={label} className="flex items-center gap-3 px-1 py-1.5">
                {bar}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminBarChart;
