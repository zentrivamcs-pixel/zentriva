// Draws the member's ID card onto a canvas from their actual profile data
// (name, tier, member ID, issued date, profile photo) — used both for the
// "Download Digital Badge" PNG and for the print output, so what you print
// always matches what you'd download.
//
// Canvas is sized to the ISO/IEC 7810 ID-1 format (85.60mm x 53.98mm) — the
// standard card dimensions used by credit cards, driver's licenses, and
// physical membership/badge cards — so both exports match a real card.
//
// PRINT STANDARDS
// - All critical content (text, photo, QR) sits inside a 5mm safe zone from
//   the trim edge, so nothing important is lost to cutting tolerance.
// - Backgrounds (gradient, panels, header/footer bands, brand stripe) can
//   extend 3mm past the trim into a bleed area. Pass { bleed: true } to
//   getMembershipCardPrintImages() to get full-bleed, square-cornered images
//   sized 91.6mm x 59.98mm for a professional card printer; the default
//   (no bleed, rounded corners) is right for home printing and on-screen use.
//
// TEXT SAFETY
// - Member-supplied values (full name, tier, ID, email) are auto-fitted:
//   the font shrinks toward a minimum size, then the text is ellipsized as
//   a last resort — long names can never collide with the QR panel or run
//   off the card.

import QRCode from 'qrcode';
import { buildMembershipQrValue } from './membershipQr';

export const CARD_WIDTH_MM = 85.6;
export const CARD_HEIGHT_MM = 53.98;
export const BLEED_MM = 3;
const PPMM = 12; // pixels per mm before device-pixel scaling
const CARD_WIDTH = Math.round(CARD_WIDTH_MM * PPMM);
const CARD_HEIGHT = Math.round(CARD_HEIGHT_MM * PPMM);
const BLEED = Math.round(BLEED_MM * PPMM);
const MARGIN = Math.round(5 * PPMM); // 5mm safe zone for all critical content

const INK = '#0E2A1F';
const LEAF = '#1F7A4D';
const LIME = '#B8E64C';
const PAPER = '#F6F8F4';
// Darker than the old #6B7A72 — small labels need the extra contrast to
// survive physical printing, where light greys wash out.
const LABEL = '#4C5B53';
const BODY_TEXT = '#33463C';
const HAIRLINE = 'rgba(14,42,31,0.08)';
const LOGO_SRC = `${process.env.PUBLIC_URL}/logo-zentriva.jpeg`;

// Type ramp — every size on the card comes from here, so the hierarchy
// stays consistent across faces and future tweaks stay proportional.
const TYPE = {
  label: 10, // letter-spaced eyebrow labels
  caption: 11, // tagline, small notes
  body: 12, // back-of-card notice text
  value: 15, // back-of-card grid values
  heading: 18, // org name
  tier: 22, // position / tier (auto-fit max)
  name: 28, // member name (auto-fit max)
  id: 34, // ID number (auto-fit max)
};

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function measureLetterSpaced(ctx, text, spacing) {
  return ctx.measureText(text).width + spacing * Math.max(text.length - 1, 0);
}

function drawLetterSpacedText(ctx, text, x, y, spacing) {
  let cursorX = x;
  for (const char of text) {
    ctx.fillText(char, cursorX, y);
    cursorX += ctx.measureText(char).width + spacing;
  }
}

// Letter-spaced eyebrow label; pass align 'center' to center it on x.
function drawLabel(ctx, text, x, y, color = LABEL, align = 'left') {
  const spacing = 1.5;
  ctx.font = `bold ${TYPE.label}px Inter, sans-serif`;
  ctx.fillStyle = color;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  const startX = align === 'center' ? x - measureLetterSpaced(ctx, text, spacing) / 2 : x;
  drawLetterSpacedText(ctx, text, startX, y, spacing);
  ctx.textAlign = prevAlign;
}

// Shrinks the font (via makeFont) until `text` fits inside maxWidth, down to
// minSize; if it still doesn't fit at minSize, ellipsizes. Leaves ctx.font
// set to the fitted font and returns the (possibly truncated) text.
function fitText(ctx, text, maxWidth, baseSize, minSize, makeFont) {
  let size = baseSize;
  ctx.font = makeFont(size);
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = makeFont(size);
  }
  let out = text;
  if (ctx.measureText(out).width > maxWidth) {
    while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
      out = out.slice(0, -1);
    }
    out = `${out}…`;
  }
  return { text: out, size };
}

// Same idea for letter-spaced runs (the ID number).
function fitLetterSpaced(ctx, text, maxWidth, baseSize, minSize, spacing, makeFont) {
  let size = baseSize;
  ctx.font = makeFont(size);
  while (size > minSize && measureLetterSpaced(ctx, text, spacing) > maxWidth) {
    size -= 1;
    ctx.font = makeFont(size);
  }
  return size;
}

// Greedy word-wrap, split into a measure step and a draw step so callers can
// compute a block's total height (to center it) before actually painting it.
function wrapLines(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Draws pre-wrapped lines starting at baseline y; returns the last line's
// baseline y so callers can lay out whatever comes next below it.
function drawLines(ctx, lines, x, y, lineHeight) {
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  return y + (lines.length - 1) * lineHeight;
}

function getInitials(fullName) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    // The profile photo is fetched from Vercel Blob storage — a different
    // origin than the app. Without this, drawing it onto the canvas taints
    // the canvas (no CORS attestation), and toDataURL/toBlob then throw
    // SecurityError when the badge is downloaded or printed.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function renderQrCanvas(value, size) {
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, value, {
    width: size,
    margin: 0,
    color: { dark: INK, light: '#ffffff' },
  });
  return qrCanvas;
}

// Draws the member's profile photo — sourced from their uploaded profile
// picture — into a rounded frame, cover-fit so it fills the frame without
// distortion. Falls back to their initials when no photo has been set.
function drawProfilePhoto(ctx, image, member, x, y, w, h) {
  roundRect(ctx, x, y, w, h, 14);
  ctx.save();
  ctx.clip();

  if (image) {
    const imgScale = Math.max(w / image.width, h / image.height);
    const drawWidth = image.width * imgScale;
    const drawHeight = image.height * imgScale;
    ctx.drawImage(image, x + (w - drawWidth) / 2, y + (h - drawHeight) / 2, drawWidth, drawHeight);
  } else {
    ctx.fillStyle = 'rgba(31,122,77,0.12)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = LEAF;
    ctx.font = `600 ${Math.round(Math.min(w, h) * 0.32)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getInitials(member.fullName), x + w / 2, y + h / 2 + 1);
  }

  ctx.restore();
  roundRect(ctx, x, y, w, h, 14);
  ctx.strokeStyle = LEAF;
  ctx.lineWidth = 3;
  ctx.stroke();
}

// Faint watermark bars, matching the reference card's bottom-right motif.
function drawMotifBars(ctx, centerX, baseY) {
  const heights = [20, 34, 48, 60];
  const barWidth = 10;
  const gap = 8;
  const totalWidth = heights.length * barWidth + (heights.length - 1) * gap;
  let x = centerX - totalWidth / 2;
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = LEAF;
  for (const h of heights) {
    roundRect(ctx, x, baseY - h, barWidth, h, 3);
    ctx.fill();
    x += barWidth + gap;
  }
  ctx.restore();
}

// Draws the Zentriva mark in a white chip — the source logo has an opaque
// white backdrop, so this keeps it legible on the card's dark surfaces.
function drawBrandMark(ctx, logoImage, x, y, size) {
  roundRect(ctx, x, y, size, size, size * 0.22);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  if (logoImage) {
    const pad = size * 0.1;
    const inner = size - pad * 2;
    ctx.save();
    roundRect(ctx, x + pad, y + pad, inner, inner, inner * 0.18);
    ctx.clip();
    ctx.drawImage(logoImage, x + pad, y + pad, inner, inner);
    ctx.restore();
  }
}

// Draws the logo directly, no white chip — for use on surfaces that are
// already light, where the chip would be invisible anyway.
function drawLogoPlain(ctx, logoImage, x, y, size) {
  if (!logoImage) return;
  ctx.save();
  roundRect(ctx, x, y, size, size, size * 0.18);
  ctx.clip();
  ctx.drawImage(logoImage, x, y, size, size);
  ctx.restore();
}

// Sets up the face's outer shape. With no bleed we clip to the rounded card;
// with bleed we skip the clip so backgrounds can run past the trim line.
// Returns the rect that backgrounds should fill edge-to-edge.
function beginFace(ctx, bleed) {
  ctx.save();
  if (!bleed) {
    roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, 20);
    ctx.clip();
  }
  return {
    x: -bleed,
    y: -bleed,
    w: CARD_WIDTH + bleed * 2,
    h: CARD_HEIGHT + bleed * 2,
  };
}

async function drawFront(ctx, member, profileImage, logoImage, bleed = 0) {
  const bg = beginFace(ctx, bleed);

  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  gradient.addColorStop(0, '#F3F8F1');
  gradient.addColorStop(0.58, '#EAF2E7');
  gradient.addColorStop(1, '#DCEBD8');
  ctx.fillStyle = gradient;
  ctx.fillRect(bg.x, bg.y, bg.w, bg.h);

  // Brand stripe along the top edge — LEAF into LIME. Runs into the bleed.
  const stripeGradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, 0);
  stripeGradient.addColorStop(0, LEAF);
  stripeGradient.addColorStop(1, LIME);
  ctx.fillStyle = stripeGradient;
  ctx.fillRect(bg.x, bg.y, bg.w, 8 + bleed);

  // Large, faint logo watermark behind everything else. Slightly stronger
  // than on screen designs would need — 5-6% alpha disappears in print.
  if (logoImage) {
    const wmSize = 340;
    const wmOffset = 70;
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.drawImage(logoImage, CARD_WIDTH - wmSize + wmOffset, CARD_HEIGHT - wmSize + wmOffset, wmSize, wmSize);
    ctx.restore();
  }

  const rightWidth = 320;
  const leftWidth = CARD_WIDTH - rightWidth;

  // Brand + QR panel (right column)
  ctx.fillStyle = 'rgba(31,122,77,0.05)';
  ctx.fillRect(leftWidth, bg.y, CARD_WIDTH - leftWidth + bleed, bg.h);
  ctx.strokeStyle = 'rgba(14,42,31,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftWidth, bg.y);
  ctx.lineTo(leftWidth, bg.y + bg.h);
  ctx.stroke();

  const panelCenterX = leftWidth + rightWidth / 2;

  const logoSize = 84;
  const logoY = MARGIN;
  drawLogoPlain(ctx, logoImage, panelCenterX - logoSize / 2, logoY, logoSize);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  drawLabel(ctx, 'ZENTRIVA', panelCenterX, logoY + logoSize + 26, INK, 'center');

  const qrBoxSize = 152;
  const qrBoxX = panelCenterX - qrBoxSize / 2;
  const qrBoxY = logoY + logoSize + 58;
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 14);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = 'rgba(14,42,31,0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();
  const qrCanvas = await renderQrCanvas(buildMembershipQrValue(member), 132);
  ctx.drawImage(qrCanvas, qrBoxX + 10, qrBoxY + 10, 132, 132);

  drawLabel(ctx, 'SCAN TO VERIFY', panelCenterX, qrBoxY + qrBoxSize + 26, LABEL, 'center');

  // Bottom decorations sit just above the safe-zone line, not at the trim.
  drawMotifBars(ctx, panelCenterX, CARD_HEIGHT - 84);
  drawLabel(ctx, 'PROPERTY OF ZENTRIVA', panelCenterX, CARD_HEIGHT - MARGIN + 2, LABEL, 'center');

  // Photo + org branding stay top-anchored; member details are centered in
  // whatever space remains below them, aligned to the safe margin so long
  // values get the full column width.
  const photoW = 160;
  const photoH = 188;
  const photoY = MARGIN;

  drawProfilePhoto(ctx, profileImage, member, MARGIN, photoY, photoW, photoH);

  const orgX = MARGIN + photoW + 20;
  ctx.textAlign = 'left';
  drawLabel(ctx, 'OFFICIAL MEMBERSHIP CARD', orgX, photoY + 16, LEAF);

  ctx.font = `bold ${TYPE.heading}px Inter, sans-serif`;
  ctx.fillStyle = INK;
  ctx.fillText('Zentriva Multipurpose', orgX, photoY + 44);
  ctx.fillText('Cooperative Society', orgX, photoY + 66);

  ctx.font = `italic ${TYPE.caption}px Inter, sans-serif`;
  ctx.fillStyle = LABEL;
  ctx.fillText('Rooted in Purpose. Built for Impact.', orgX, photoY + 88);

  // Member details: full name, position + badge, ID number — centered in
  // the remaining space below the photo, aligned with the photo's left edge
  // so the widest possible measure is available for long names.
  const detailX = MARGIN;
  const detailWidth = leftWidth - MARGIN - 32;
  const zoneTop = photoY + photoH + 24;
  const zoneBottom = CARD_HEIGHT - MARGIN;
  const detailsBlockHeight = 226; // FULL NAME label baseline → MEMBER SINCE baseline
  const dy = zoneTop + (zoneBottom - zoneTop - detailsBlockHeight) / 2 + 8;

  const inter = (weight) => (size) => `${weight} ${size}px Inter, sans-serif`;

  drawLabel(ctx, 'FULL NAME', detailX, dy);
  const fittedName = fitText(ctx, member.fullName.toUpperCase(), detailWidth, TYPE.name, 18, inter(700));
  ctx.fillStyle = INK;
  ctx.fillText(fittedName.text, detailX, dy + 32);

  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(detailX, dy + 52);
  ctx.lineTo(detailX + detailWidth, dy + 52);
  ctx.stroke();

  drawLabel(ctx, 'POSITION', detailX, dy + 76);
  // The tier badge is measured first so the tier text can be fitted into
  // exactly the space that remains beside it.
  const badgeText = member.tierBadge.toUpperCase();
  ctx.font = `bold ${TYPE.label}px Inter, sans-serif`;
  const badgePadX = 10;
  const badgeWidth = ctx.measureText(badgeText).width + badgePadX * 2;
  const fittedTier = fitText(ctx, member.tierLabel, detailWidth - badgeWidth - 14, TYPE.tier, 14, inter(600));
  ctx.fillStyle = INK;
  ctx.fillText(fittedTier.text, detailX, dy + 106);

  const tierWidth = ctx.measureText(fittedTier.text).width;
  const badgeX = detailX + tierWidth + 14;
  const badgeY = dy + 106 - 17;
  roundRect(ctx, badgeX, badgeY, badgeWidth, 24, 12);
  ctx.fillStyle = LIME;
  ctx.fill();
  ctx.strokeStyle = 'rgba(14,42,31,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.font = `bold ${TYPE.label}px Inter, sans-serif`;
  ctx.fillStyle = INK;
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, badgeX + badgePadX, badgeY + 12);
  ctx.textBaseline = 'alphabetic';

  ctx.beginPath();
  ctx.strokeStyle = HAIRLINE;
  ctx.moveTo(detailX, dy + 126);
  ctx.lineTo(detailX + detailWidth, dy + 126);
  ctx.stroke();

  drawLabel(ctx, 'ID NUMBER', detailX, dy + 150);
  const mono = (size) => `700 ${size}px "Courier New", monospace`;
  const idSpacing = 2;
  fitLetterSpaced(ctx, member.membershipId, detailWidth, TYPE.id, 20, idSpacing, mono);
  ctx.fillStyle = LEAF;
  drawLetterSpacedText(ctx, member.membershipId, detailX, dy + 192, idSpacing);

  ctx.font = `bold ${TYPE.label}px Inter, sans-serif`;
  ctx.fillStyle = LABEL;
  ctx.fillText(`MEMBER SINCE ${member.memberSince}`, detailX, dy + 218);

  ctx.restore();
}

function drawBack(ctx, member, logoImage, bleed = 0) {
  const bg = beginFace(ctx, bleed);

  ctx.fillStyle = PAPER;
  ctx.fillRect(bg.x, bg.y, bg.w, bg.h);

  const headerHeight = 72;
  ctx.fillStyle = INK;
  ctx.fillRect(bg.x, bg.y, bg.w, headerHeight + bleed);

  const backLogoSize = 52;
  drawBrandMark(ctx, logoImage, MARGIN, (headerHeight - backLogoSize) / 2, backLogoSize);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 13px Inter, sans-serif';
  ctx.fillStyle = '#ffffff';
  drawLetterSpacedText(ctx, 'ZENTRIVA', MARGIN + backLogoSize + 14, headerHeight / 2 + 5, 2);

  ctx.textAlign = 'right';
  ctx.font = '13px "Courier New", monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(member.membershipId, CARD_WIDTH - MARGIN, headerHeight / 2 + 5);

  // Notice, detail grid, and signature strip are centered as one block in
  // the space between the header and footer, so there's no dead space at
  // the bottom when printed at true physical size.
  const maxWidth = CARD_WIDTH - MARGIN * 2;
  const lineHeight = 19;
  const noticeFont = `${TYPE.body}px Inter, sans-serif`;
  ctx.font = noticeFont;
  const noticeLines = wrapLines(
    ctx,
    'This card is the property of Zentriva Multipurpose Cooperative Society Limited and must be ' +
      'surrendered on request or upon exit from the organisation. It identifies the named holder ' +
      'only and is not transferable. If found, please return to the nearest Zentriva office or ' +
      'contact us using the details below.',
    maxWidth
  );
  const noticeHeight = noticeLines.length * lineHeight;

  const col1X = MARGIN;
  const col2X = MARGIN + maxWidth / 2 + 12;
  const colWidth = maxWidth / 2 - 24;
  const rowGap = 58;

  // Core rows are always shown; a contact row appears only when the member
  // record actually carries an email or phone.
  const rows = [
    [
      ['DATE ISSUED', member.issuedDate],
      ['NEXT RENEWAL', member.nextRenewal],
    ],
    [
      ['MEMBERSHIP TIER', member.tierLabel],
      ['MEMBER SINCE', member.memberSince],
    ],
  ];
  if (member.email || member.phone) {
    const contactRow = [];
    if (member.email) contactRow.push(['EMAIL', member.email]);
    if (member.phone) contactRow.push(['PHONE', member.phone]);
    rows.push(contactRow);
  }

  const gridHeight = (rows.length - 1) * rowGap + 34;
  const signatureHeight = 30;
  const gapNoticeToGrid = 40;
  const gapGridToSignature = 44;

  const footerHeight = 40;
  const bodyTop = headerHeight;
  const bodyBottom = CARD_HEIGHT - footerHeight;
  const contentHeight = noticeHeight + gapNoticeToGrid + gridHeight + gapGridToSignature + signatureHeight;
  const contentStartY = bodyTop + (bodyBottom - bodyTop - contentHeight) / 2;

  ctx.textAlign = 'left';
  ctx.font = noticeFont;
  ctx.fillStyle = BODY_TEXT;
  const noticeEndY = drawLines(ctx, noticeLines, MARGIN, contentStartY + 12, lineHeight);

  const inter = (weight) => (size) => `${weight} ${size}px Inter, sans-serif`;
  const gridStartY = noticeEndY + gapNoticeToGrid;
  rows.forEach((row, rowIndex) => {
    row.forEach(([label, value], colIndex) => {
      const x = colIndex === 0 ? col1X : col2X;
      const y = gridStartY + rowIndex * rowGap;
      drawLabel(ctx, label, x, y);
      const fitted = fitText(ctx, String(value), colWidth, TYPE.value, 11, inter(700));
      ctx.fillStyle = INK;
      ctx.fillText(fitted.text, x, y + 22);
    });
  });

  const signatureY = gridStartY + (rows.length - 1) * rowGap + 22 + gapGridToSignature;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(MARGIN, signatureY);
  ctx.lineTo(MARGIN + 320, signatureY);
  ctx.stroke();
  drawLabel(ctx, 'AUTHORIZED SIGNATURE', MARGIN, signatureY + 18);

  ctx.fillStyle = '#E5ECE3';
  ctx.fillRect(bg.x, CARD_HEIGHT - footerHeight, bg.w, footerHeight + bleed);
  ctx.textAlign = 'left';
  drawLabel(
    ctx,
    'ZENTRIVA MULTIPURPOSE COOPERATIVE SOCIETY',
    CARD_WIDTH / 2,
    CARD_HEIGHT - footerHeight / 2 + 3,
    LABEL,
    'center'
  );

  ctx.restore();
}

async function createCanvas(drawFn, bleed = 0) {
  const scale = 3;
  const canvas = document.createElement('canvas');
  canvas.width = (CARD_WIDTH + bleed * 2) * scale;
  canvas.height = (CARD_HEIGHT + bleed * 2) * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.translate(bleed, bleed);
  await drawFn(ctx);
  return canvas;
}

async function loadCardAssets(member) {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  const [profileImage, logoImage] = await Promise.all([loadImage(member.avatarSrc), loadImage(LOGO_SRC)]);
  return { profileImage, logoImage };
}

export async function downloadMembershipBadge(member) {
  const { profileImage, logoImage } = await loadCardAssets(member);
  const canvas = await createCanvas((ctx) => drawFront(ctx, member, profileImage, logoImage));

  await new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `zentriva-membership-${member.membershipId}.png`;
        link.click();
        URL.revokeObjectURL(url);
      }
      resolve();
    }, 'image/png');
  });
}

// Renders both faces as data URLs for the print view — printing needs
// static, correctly-sized images rather than the responsive on-screen flip
// card.
//
// Default: rounded corners, exactly 85.6mm x 53.98mm — for home printing.
// { bleed: true }: square corners with a 3mm bleed on every side
// (91.6mm x 59.98mm total) — hand these to a professional card printer and
// tell them the trim size is 85.6mm x 53.98mm. widthMm/heightMm in the
// return value always reflect the physical size the images should be
// placed at.
export async function getMembershipCardPrintImages(member, { bleed = false } = {}) {
  const bleedPx = bleed ? BLEED : 0;
  const { profileImage, logoImage } = await loadCardAssets(member);
  const [frontCanvas, backCanvas] = await Promise.all([
    createCanvas((ctx) => drawFront(ctx, member, profileImage, logoImage, bleedPx), bleedPx),
    createCanvas((ctx) => drawBack(ctx, member, logoImage, bleedPx), bleedPx),
  ]);
  return {
    front: frontCanvas.toDataURL('image/png'),
    back: backCanvas.toDataURL('image/png'),
    widthMm: CARD_WIDTH_MM + (bleed ? BLEED_MM * 2 : 0),
    heightMm: CARD_HEIGHT_MM + (bleed ? BLEED_MM * 2 : 0),
  };
}
