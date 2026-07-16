import React from 'react';
import ImagePlaceholder from '../shared/ImagePlaceholder';
import Logo, { LOGO_SRC } from '../shared/Logo';
import QrVerificationCode from './QrVerificationCode';

function MembershipCardFront({ member, avatarSrc, copied, onCopyId, onFlip, qrValue }) {
  const handleCopyClick = (e) => {
    e.stopPropagation();
    onCopyId();
  };

  return (
    <div
      className="flip-face absolute inset-0 rounded-xl overflow-hidden shadow-xl membership-card-gradient text-[#0E2A1F] flex flex-col cursor-pointer"
      style={{ backfaceVisibility: 'hidden' }}
      onClick={onFlip}
    >
      {/* Brand stripe */}
      <div className="h-2 flex-shrink-0 bg-gradient-to-r from-[#1F7A4D] to-[#B8E64C]" />

      {/* Watermark */}
      <img
        src={LOGO_SRC}
        alt=""
        aria-hidden="true"
        className="absolute -right-16 -bottom-16 w-80 h-80 object-contain opacity-[0.07] pointer-events-none select-none"
      />

      <div className="relative flex-1 min-w-0 flex">
        {/* Main info */}
        <div className="flex-1 min-w-0 p-6 sm:p-8 flex flex-col z-10">
          {/* Photo + org branding, top */}
          <div className="flex items-start gap-4 flex-shrink-0">
            <div className="w-24 h-28 sm:w-32 sm:h-36 rounded-lg overflow-hidden border-[3px] border-[#1F7A4D] flex-shrink-0">
              <ImagePlaceholder
                src={avatarSrc}
                icon="person"
                alt={`${member.fullName}'s profile photo`}
                shape="rect"
                className="w-full h-full text-2xl bg-[#1F7A4D]/10 text-[#1F7A4D] border-none"
              />
            </div>
            <div className="min-w-0 pt-1">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#1F7A4D]">
                Official Membership Card
              </p>
              <p className="font-headline-md leading-snug mt-1.5 text-[#0E2A1F]">
                Zentriva Multipurpose
                <br />
                Cooperative Society
              </p>
              <p className="text-[11px] italic text-[#4C5B53] mt-1.5">Rooted in Purpose. Built for Impact.</p>
            </div>
          </div>

          {/* Member details, centered in the space below the photo */}
          <div className="flex-1 flex flex-col justify-center gap-3">
            <div className="pb-3 border-b border-[#0E2A1F]/10">
              <p className="text-xs font-bold tracking-widest text-[#4C5B53] uppercase mb-1">Full Name</p>
              <p className="text-2xl sm:text-3xl font-bold uppercase tracking-wide text-[#0E2A1F]">
                {member.fullName}
              </p>
            </div>

            <div className="pb-3 border-b border-[#0E2A1F]/10">
              <p className="text-xs font-bold tracking-widest text-[#4C5B53] uppercase mb-1">Position</p>
              <div className="flex items-center gap-3">
                <p className="text-xl sm:text-2xl font-semibold text-[#0E2A1F]">{member.tierLabel}</p>
                <span className="inline-block px-3 py-1 bg-[#B8E64C] text-[#0E2A1F] rounded-full text-[10px] font-bold tracking-wide uppercase">
                  {member.tierBadge}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold tracking-widest text-[#4C5B53] uppercase mb-1">ID Number</p>
              <button
                type="button"
                onClick={handleCopyClick}
                title="Click to copy"
                className={`bg-transparent text-3xl sm:text-4xl font-bold tracking-[0.08em] font-mono transition-colors ${
                  copied ? 'text-[#0E2A1F]' : 'text-[#1F7A4D] hover:opacity-80'
                }`}
              >
                {copied ? 'COPIED!' : member.membershipId}
              </button>
              <p className="text-[10px] font-bold tracking-widest uppercase text-[#4C5B53] mt-1">
                Member Since {member.memberSince}
              </p>
            </div>
          </div>
        </div>

        {/* Brand + QR panel */}
        <div className="relative w-32 sm:w-40 flex-shrink-0 flex flex-col items-center justify-between border-l border-[#0E2A1F]/10 bg-[#1F7A4D]/5 py-6 px-3 z-10 overflow-hidden">
          <div className="flex flex-col items-center gap-2">
            <Logo className="h-16 w-16" />
            <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-[#0E2A1F]">Zentriva</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="bg-white rounded-lg p-2 shadow-inner border border-[#0E2A1F]/10">
              <QrVerificationCode value={qrValue} size={84} label="Membership verification QR code" />
            </div>
            <p className="text-[9px] font-bold tracking-widest text-[#4C5B53] uppercase text-center">
              Scan to verify
            </p>
          </div>

          {/* Decorative bars, matching the reference card's watermark */}
          <div className="absolute bottom-0 right-4 flex items-end gap-[7px] opacity-20 pointer-events-none">
            <span className="w-[10px] h-6 bg-[#1F7A4D] rounded-t" />
            <span className="w-[10px] h-10 bg-[#1F7A4D] rounded-t" />
            <span className="w-[10px] h-16 bg-[#1F7A4D] rounded-t" />
            <span className="w-[10px] h-20 bg-[#1F7A4D] rounded-t" />
          </div>
          <p className="text-[9px] text-[#4C5B53] uppercase tracking-wide text-center relative">
            Property of Zentriva
          </p>
        </div>
      </div>
    </div>
  );
}

export default MembershipCardFront;
