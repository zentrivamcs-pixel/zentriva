import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buildMembersFilterUrl } from './adminHelpers';

// Validated categorical palette (light mode), used unchanged — see the
// dataviz skill's reference palette. Kept to the first 4 slots, which are
// the ones validated for all-pairs adjacency (every slice touches every
// other slice in a donut with this few segments).
export const CHART_COLORS = ['#2a78d6', '#008300', '#e87ba4', '#eda100'];

const SIZE = 160;
const RADIUS = 62;
const STROKE = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 3; // px gap between adjacent slices, in place of a border

// A donut chart for a single categorical field with few (<=4) values —
// e.g. Gender, Membership Category/Tier. Always ships its legend (the
// dependable identity channel) with the exact count/percent per slice, so
// no value is gated behind hover; the native <title> is a hover bonus only.
//
// `data` holds the raw field values (e.g. "standard", "Executive Member")
// so slices/legend rows link to the exact Members filter that produces
// them; `formatLabel` maps a raw value to what's actually displayed.
function AdminPieChart({ title, subtitle, data, field, colors = CHART_COLORS, formatLabel = (v) => v }) {
  const navigate = useNavigate();
  const total = data.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
      <h4 className="font-label-md font-bold text-primary">{title}</h4>
      {subtitle && <p className="text-label-sm text-on-surface-variant mt-0.5">{subtitle}</p>}

      {total === 0 ? (
        <p className="text-on-surface-variant text-body-md text-center py-10">No data yet</p>
      ) : (
        <div className="flex items-center gap-6 mt-4">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="flex-shrink-0">
            <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="#e6e8ea"
                strokeWidth={STROKE}
              />
              {data.reduce((acc, [value, count], i) => {
                const frac = count / total;
                const len = Math.max(frac * CIRCUMFERENCE - (data.length > 1 ? GAP : 0), 0);
                const el = (
                  <circle
                    key={value}
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={colors[i % colors.length]}
                    strokeWidth={STROKE}
                    strokeDasharray={`${len} ${CIRCUMFERENCE - len}`}
                    strokeDashoffset={-acc.offset}
                    className={field ? 'cursor-pointer hover:opacity-80 transition-opacity' : undefined}
                    onClick={field ? () => navigate(buildMembersFilterUrl(field, value)) : undefined}
                  >
                    <title>{`${formatLabel(value)}: ${count} (${Math.round(frac * 100)}%) — view members`}</title>
                  </circle>
                );
                acc.offset += frac * CIRCUMFERENCE;
                acc.els.push(el);
                return acc;
              }, { offset: 0, els: [] }).els}
            </g>
            <text
              x={SIZE / 2}
              y={SIZE / 2 - 4}
              textAnchor="middle"
              className="fill-primary"
              style={{ fontSize: 22, fontWeight: 700 }}
            >
              {total}
            </text>
            <text
              x={SIZE / 2}
              y={SIZE / 2 + 16}
              textAnchor="middle"
              className="fill-on-surface-variant"
              style={{ fontSize: 11 }}
            >
              members
            </text>
          </svg>

          <div className="flex-1 space-y-2 min-w-0">
            {data.map(([value, count], i) => {
              const row = (
                <>
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: colors[i % colors.length] }}
                  />
                  <span className="text-on-surface truncate flex-1">{formatLabel(value)}</span>
                  <span className="text-on-surface-variant flex-shrink-0">
                    {count} ({Math.round((count / total) * 100)}%)
                  </span>
                </>
              );
              return field ? (
                <Link
                  key={value}
                  to={buildMembersFilterUrl(field, value)}
                  className="flex items-center gap-2 text-label-sm no-underline -mx-1 px-1 py-0.5 rounded hover:bg-surface-container-low transition-colors"
                >
                  {row}
                </Link>
              ) : (
                <div key={value} className="flex items-center gap-2 text-label-sm">
                  {row}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPieChart;
