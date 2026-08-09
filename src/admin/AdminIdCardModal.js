import React, { useEffect, useState } from 'react';
import { renderMemberIdCard, downloadCardImage } from './exportMemberIdCard';

// Shows a member's ID card — both faces, at the proportions they print at —
// before anything is saved. The download buttons write out these exact
// images, so an admin never sends a member a card they haven't looked at.
function AdminIdCardModal({ member, onClose }) {
  const [card, setCard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Guards against a stale render landing after the admin has moved on to
    // another member (the photo fetch makes this slow enough to matter).
    let current = true;
    setCard(null);
    setError('');
    renderMemberIdCard(member)
      .then((result) => { if (current) setCard(result); })
      .catch((err) => {
        console.error('Error rendering ID card:', err);
        if (current) setError('The ID card could not be generated.');
      });
    return () => { current = false; };
  }, [member]);

  const faces = card
    ? [['Front', card.images.front], ['Back', card.images.back]]
    : [];

  return (
    <div className="fixed inset-0 bg-on-background/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-3xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant sticky top-0 bg-surface-container-lowest">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary">Membership ID Card</h2>
            <p className="text-label-sm text-on-surface-variant">
              {member.full_name}
              <span className="font-mono"> · {member.membership_id || '—'}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-transparent p-1 text-on-surface-variant hover:text-primary transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6">
          {error && <p className="text-error text-body-md" role="alert">{error}</p>}

          {!card && !error && (
            <p className="text-on-surface-variant text-body-md">Rendering the card…</p>
          )}

          {card && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              {faces.map(([label, src]) => (
                <figure key={label} className="m-0">
                  <img
                    src={src}
                    alt={`Membership card ${label.toLowerCase()}`}
                    className="w-full rounded-lg border border-outline-variant shadow-sm bg-white"
                  />
                  <figcaption className="mt-2 text-label-sm text-on-surface-variant text-center">{label}</figcaption>
                </figure>
              ))}
            </div>
          )}

          {card && !member.passport_photo_url && (
            <p className="mt-4 text-label-sm text-outline">
              This member has no profile photo, so the card shows their initials.
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-low">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-outline-variant rounded-lg text-label-md hover:bg-surface-container-lowest transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            disabled={!card}
            onClick={() => downloadCardImage(card.images.back, card.view.membershipId, 'back')}
            className="px-4 py-2 border border-outline-variant text-primary rounded-lg text-label-md flex items-center gap-2 hover:bg-surface-container-lowest transition-colors bg-transparent disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download back
          </button>
          <button
            type="button"
            disabled={!card}
            onClick={() => downloadCardImage(card.images.front, card.view.membershipId, 'front')}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-label-md flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download front
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminIdCardModal;
