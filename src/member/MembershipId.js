import React, { useMemo, useState } from 'react';
import { downloadMembershipBadge, getMembershipCardPrintImages, CARD_WIDTH_MM, CARD_HEIGHT_MM } from './generateMembershipBadge';
import { useProfile } from './ProfileContext';
import { useMemberAuth } from './MemberAuthContext';
import MembershipCardFront from './MembershipCardFront';
import MembershipCardBack from './MembershipCardBack';
import QrVerificationCode from './QrVerificationCode';
import { buildMembershipQrValue } from './membershipQr';

function MembershipId() {
  const { view } = useMemberAuth();
  const [copied, setCopied] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printImages, setPrintImages] = useState(null);
  const [shareStatus, setShareStatus] = useState('');
  const { avatarSrc } = useProfile();

  // The card's front/back, the download, and the print output all draw from
  // this one object, so the contact row (email/phone) and photo show up
  // identically everywhere the card appears.
  const member = useMemo(() => ({ ...view, avatarSrc }), [view, avatarSrc]);

  const qrValue = useMemo(() => buildMembershipQrValue(member), [member]);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(member.membershipId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied — nothing to fall back to, so just no-op.
    }
  };

  const toggleFlip = () => setFlipped((f) => !f);

  const handleDownloadBadge = async () => {
    setDownloading(true);
    try {
      await downloadMembershipBadge(member);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Zentriva Membership',
      text: `${member.fullName} — ${member.tierLabel} (${member.membershipId})`,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled the share sheet — nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${shareData.title}: ${shareData.text}`);
      setShareStatus('Copied to clipboard');
      setTimeout(() => setShareStatus(''), 2000);
    } catch {
      // Clipboard access denied — nothing to fall back to.
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const images = await getMembershipCardPrintImages(member);
      setPrintImages(images);
      // Give the print-only <img> tags a paint cycle to pick up their src
      // before the print dialog captures the page.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      window.print();
    } finally {
      setPrinting(false);
    }
  };

  const cardDetails = [
    ['Membership ID', member.membershipId],
    ['Category', member.tierLabel],
    ['Tier', member.tierBadge],
    ['Date Issued', member.issuedDate],
    ['Next Renewal', member.nextRenewal],
    ['Status', member.active ? 'Active' : 'Renewal due'],
  ];

  return (
    <>
      <div className="mb-10 print:hidden">
        <h2 className="font-headline-lg text-headline-lg text-primary mb-2">Membership Identity</h2>
        <p className="text-secondary font-body-md">
          Manage and verify your digital membership credentials across the Zentriva network.
        </p>
      </div>

      {/* Print-only output — a standard CR80-size (85.6 x 53.98mm) render of
          both faces, generated on demand so print always matches the PNG
          export instead of trying to reflow the interactive card. */}
      {printImages && (
        <div className="hidden print:flex print:flex-col print:items-center print:gap-[8mm]">
          <img
            src={printImages.front}
            alt="Membership card front"
            style={{ width: `${CARD_WIDTH_MM}mm`, height: `${CARD_HEIGHT_MM}mm` }}
          />
          <img
            src={printImages.back}
            alt="Membership card back"
            style={{ width: `${CARD_WIDTH_MM}mm`, height: `${CARD_HEIGHT_MM}mm` }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter print:hidden">
        {/* Primary Membership Card */}
        <div className="lg:col-span-8">
          <div className="flip-scene w-full h-[440px] sm:h-[400px]">
            <div
              className="flipper relative w-full h-full"
              style={{
                transformStyle: 'preserve-3d',
                transform: flipped ? 'rotateY(180deg)' : 'none',
              }}
            >
              <MembershipCardFront
                member={member}
                avatarSrc={avatarSrc}
                copied={copied}
                onCopyId={handleCopyId}
                onFlip={toggleFlip}
                qrValue={qrValue}
              />
              <MembershipCardBack member={member} onFlip={toggleFlip} />
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={toggleFlip}
              className="bg-transparent flex items-center gap-2 px-5 py-2 border border-outline-variant text-secondary rounded-full font-label-md text-label-md hover:text-primary hover:border-primary/40 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">cached</span>
              Flip Card
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={handleDownloadBadge}
              disabled={downloading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-primary text-white rounded-lg font-bold font-label-md transition-all hover:bg-primary/90 active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              <span className="material-symbols-outlined">download</span>
              {downloading ? 'Preparing…' : 'Download Digital Badge'}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 border border-outline-variant bg-white text-primary rounded-lg font-bold font-label-md transition-all hover:bg-surface-container-low active:scale-95"
            >
              <span className="material-symbols-outlined">share</span>
              {shareStatus || 'Share Credentials'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={printing}
              aria-label="Print membership ID (front and back)"
              className="flex items-center justify-center w-12 h-12 border border-outline-variant bg-white text-secondary rounded-lg hover:text-primary transition-all disabled:opacity-60"
            >
              <span className="material-symbols-outlined">{printing ? 'hourglass_top' : 'print'}</span>
            </button>
          </div>
        </div>

        {/* Secondary column */}
        <div className="lg:col-span-4 flex flex-col gap-gutter">
          <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
            <h3 className="font-label-md font-bold text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary-container text-lg">verified_user</span>
              Quick Verification
            </h3>
            <div className="flex justify-center mb-4 bg-surface-container-low p-4 rounded-lg">
              <div className="w-40 h-40 bg-white p-2 rounded-lg border border-outline-variant flex items-center justify-center">
                <QrVerificationCode value={qrValue} size={140} label="Membership verification QR code" />
              </div>
            </div>
            <p className="text-xs text-secondary text-center">
              Present this QR code at Zentriva programs and partner venues to verify your membership.
            </p>
          </div>

          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6">
            <h3 className="font-label-md font-bold text-primary mb-2">Card Details</h3>
            <div className="mt-4 divide-y divide-outline-variant/50">
              {cardDetails.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-3 gap-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-secondary">{label}</span>
                  <span className="text-sm font-semibold text-primary text-right truncate">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default MembershipId;
