import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { currentMember } from './memberData';
import { initialProfile } from './profileData';
import { usageSummary, securityStatus, idFeatureCards } from './membershipCardData';
import { downloadMembershipBadge, getMembershipCardPrintImages, CARD_WIDTH_MM, CARD_HEIGHT_MM } from './generateMembershipBadge';
import { useProfile } from './ProfileContext';
import MembershipCardFront from './MembershipCardFront';
import MembershipCardBack from './MembershipCardBack';
import QrVerificationCode from './QrVerificationCode';
import { buildMembershipQrValue } from './membershipQr';

function MembershipId() {
  const [copied, setCopied] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printImages, setPrintImages] = useState(null);
  const [shareStatus, setShareStatus] = useState('');
  const { avatarSrc } = useProfile();

  // The card's front/back, the download, and the print output all draw
  // from this one object, so the contact row (email/phone) and photo show
  // up identically everywhere the card appears.
  const member = useMemo(
    () => ({
      ...currentMember,
      avatarSrc,
      email: initialProfile.email,
      phone: initialProfile.phone,
    }),
    [avatarSrc]
  );

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
              Present this QR code to any Zentriva partner facility to verify your membership.
            </p>
            <div className="mt-4 pt-4 border-t border-outline-variant">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-secondary">Security Status</span>
                <span className="text-on-tertiary-container font-bold flex items-center gap-1">
                  <span className="w-2 h-2 bg-tertiary-fixed-dim rounded-full animate-pulse" />
                  {securityStatus.label}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Last Verified</span>
                <span className="text-primary font-medium">{securityStatus.lastVerified}</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6">
            <h3 className="font-label-md font-bold text-primary mb-2">Usage Summary</h3>
            <div className="space-y-4 mt-4">
              {usageSummary.map((item) => (
                <div key={item.key} className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full ${item.iconBg} flex items-center justify-center ${item.iconColor}`}
                  >
                    <span className="material-symbols-outlined text-sm">{item.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{item.title}</p>
                    <p className="text-xs text-secondary">{item.subtitle}</p>
                  </div>
                  <span className="ml-auto font-bold text-primary">{item.value}</span>
                </div>
              ))}
            </div>
            <Link
              to="/member"
              className="block w-full mt-6 text-sm font-bold text-primary border-b border-primary/20 pb-1 hover:border-primary transition-all text-left"
            >
              View full activity history →
            </Link>
          </div>
        </div>

        {/* Bottom info cards */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {idFeatureCards.map((card) => (
            <div
              key={card.key}
              className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="material-symbols-outlined text-primary mb-3 block">{card.icon}</span>
              <h4 className="font-label-md font-bold mb-2">{card.title}</h4>
              <p className="text-xs text-secondary leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default MembershipId;
