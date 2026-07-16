import React from 'react';
import Logo from '../shared/Logo';

function MembershipCardBack({ member, onFlip }) {
  const rows = [
    [
      ['Date Issued', member.issuedDate],
      ['Next Renewal', member.nextRenewal],
    ],
    [
      ['Membership Tier', member.tierLabel],
      ['Member Since', member.memberSince],
    ],
  ];
  if (member.email || member.phone) {
    const contactRow = [];
    if (member.email) contactRow.push(['Email', member.email]);
    if (member.phone) contactRow.push(['Phone', member.phone]);
    rows.push(contactRow);
  }

  return (
    <div
      className="flip-face absolute inset-0 rounded-xl overflow-hidden shadow-xl bg-[#F6F8F4] flex flex-col cursor-pointer"
      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
      onClick={onFlip}
    >
      <div className="h-14 bg-[#0E2A1F] flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Logo onDark className="h-9 w-9" />
          <span className="text-white text-xs font-bold tracking-[0.3em] uppercase">Zentriva</span>
        </div>
        <span className="font-mono text-xs text-white/85 tracking-wider">{member.membershipId}</span>
      </div>

      <div className="flex-1 px-6 sm:px-8 py-6 flex flex-col justify-center gap-6 overflow-hidden">
        <p className="text-xs leading-relaxed text-[#33463C]">
          This card is the property of{' '}
          <span className="font-bold text-[#0E2A1F]">Zentriva Multipurpose Cooperative Society Limited</span>{' '}
          and must be surrendered on request or upon exit from the organisation. It identifies the named
          holder only and is not transferable. If found, please return to the nearest Zentriva office or
          contact us using the details below.
        </p>

        <div className="flex flex-col gap-5">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-2 gap-x-6">
              {row.map(([label, value]) => (
                <div key={label}>
                  <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#4C5B53] mb-1">{label}</p>
                  <p className="text-sm font-semibold text-[#0E2A1F] truncate">{value}</p>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="pt-2">
          <div className="w-56 border-t border-[#0E2A1F]" />
          <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#4C5B53] mt-2">
            Authorized Signature
          </p>
        </div>
      </div>

      <div className="bg-[#E5ECE3] px-6 py-2.5 flex-shrink-0">
        <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#4C5B53] text-center">
          Zentriva Multipurpose Cooperative Society
        </p>
      </div>
    </div>
  );
}

export default MembershipCardBack;
