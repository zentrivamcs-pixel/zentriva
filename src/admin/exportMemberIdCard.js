// Renders a member's ID card for the admin dashboard — the same card the
// member can export for themselves in the portal, so an admin can check it and
// reissue it without the member having to log in.
//
// The admin previews the card and then downloads the very images that were
// previewed, so what's saved is exactly what was on screen.
//
// The renderer pulls in the QR library and does its own canvas work, so it's
// loaded on demand the first time an admin opens a card (same pattern as
// exportDirectoryPdf) rather than shipping in the admin bundle.
export async function renderMemberIdCard(member) {
  const [{ getMembershipCardPrintImages }, { buildMemberView }] = await Promise.all([
    import('../member/generateMembershipBadge'),
    import('../member/memberView'),
  ]);

  // buildMemberView turns the raw member row into the card's display shape
  // (name, tier, ID number, issue/renewal dates); the photo is passed the way
  // ProfileContext supplies it in the portal.
  const view = { ...buildMemberView(member), avatarSrc: member.passport_photo_url || null };
  const images = await getMembershipCardPrintImages(view);
  return { view, images };
}

// Saves one already-rendered face. Filenames match the portal's own export
// (`zentriva-membership-<ID>.png`) so a card an admin sends a member and one
// the member downloads themselves are the same file.
export function downloadCardImage(dataUrl, membershipId, face = 'front') {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = face === 'back'
    ? `zentriva-membership-${membershipId}-back.png`
    : `zentriva-membership-${membershipId}.png`;
  link.click();
}
