// Transactional email via Resend's REST API (no SDK dependency). The whole
// module is env-gated: without RESEND_API_KEY and EMAIL_FROM it quietly
// reports itself disabled, so the app works before email is configured and
// activates the moment the env vars are set.
//
// Rules for callers:
// - sendEmail never throws — it returns { sent, error? }. Email is always
//   best-effort; a mail failure must never fail a paid registration.
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function getConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    // e.g. "Zentriva <no-reply@zentriva.org>" — must be a Resend-verified domain.
    from: process.env.EMAIL_FROM,
    // Public site origin used in email links, e.g. "https://zentriva.vercel.app".
    baseUrl: (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  };
}

function isEmailEnabled() {
  const { apiKey, from } = getConfig();
  return !!(apiKey && from);
}

// Fetches a full received (inbound) email by id. The email.received webhook
// only carries metadata, so callers hit this to get the body/attachments.
// Unlike sendEmail, this throws on failure — the webhook handler needs to
// know so it can return non-200 and let Resend retry rather than silently
// dropping the message.
async function getReceivedEmail(id) {
  const { apiKey } = getConfig();
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured on the server');
  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend receiving API returned ${response.status}: ${body}`);
  }
  return response.json();
}

async function sendEmail({ to, subject, html, text }) {
  const { apiKey, from } = getConfig();
  if (!apiKey || !from) {
    console.warn(`Email disabled (RESEND_API_KEY/EMAIL_FROM not set) — skipped "${subject}" to ${to}`);
    return { sent: false, error: 'email not configured' };
  }
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`Email send failed (${response.status}) for "${subject}" to ${to}: ${body}`);
      return { sent: false, error: `HTTP ${response.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error(`Email send error for "${subject}" to ${to}:`, err.message);
    return { sent: false, error: err.message };
  }
}

// --- Templates -----------------------------------------------------------------

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

function layout(title, bodyHtml) {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1c1c1c;">
      <h2 style="color:#1F7A4D;margin-bottom:4px;">Zentriva Multipurpose Cooperative Society</h2>
      <h3 style="margin-top:0;">${escapeHtml(title)}</h3>
      ${bodyHtml}
      <p style="color:#777;font-size:12px;margin-top:32px;border-top:1px solid #ddd;padding-top:12px;">
        You received this email because of activity on your Zentriva membership.
        If this wasn't you, please contact support.
      </p>
    </div>`;
}

// Membership confirmation, sent fire-and-forget after a registration commits.
// (Paystack sends the payment receipt itself — this is the membership side.)
// Bank-transfer registrations start life as `payment_status: 'pending_review'`
// — the member can't log in yet, so the email must say that plainly rather
// than inviting them to a portal that will reject them.
function sendRegistrationEmail(member) {
  const { baseUrl } = getConfig();
  const row = (label, value) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#555;">${label}</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(value)}</td></tr>`;
  const tier = member.membership_tier
    ? member.membership_tier[0].toUpperCase() + member.membership_tier.slice(1)
    : 'Standard';
  const pending = member.payment_status === 'pending_review';

  return sendEmail({
    to: member.email,
    subject: pending
      ? 'Zentriva registration received — payment under review'
      : 'Welcome to Zentriva — your membership is confirmed',
    text: pending
      ? `Thanks for registering, ${member.full_name}!\n\n` +
        `We've received your bank transfer proof and it's under review. You'll be able to log in to the member portal once it's approved.\n\n` +
        `Membership ID: ${member.membership_id}\nTier: ${tier}\nReference: ${member.payment_reference}\n`
      : `Welcome to Zentriva, ${member.full_name}!\n\n` +
        `Membership ID: ${member.membership_id}\nTier: ${tier}\nPayment reference: ${member.payment_reference}\n\n` +
        `Log in to the member portal: ${baseUrl}/member\n`,
    html: pending
      ? layout('Registration received — payment under review', `
        <p>Thanks for registering, <strong>${escapeHtml(member.full_name)}</strong>! We've received your bank transfer proof.</p>
        <table style="border-collapse:collapse;font-size:14px;">
          ${row('Membership ID', member.membership_id)}
          ${row('Tier', tier)}
          ${row('Reference', member.payment_reference)}
        </table>
        <p style="margin-top:20px;">An admin will verify your payment shortly. You'll be able to log in to the member portal once it's approved — no action needed from you in the meantime.</p>
      `)
      : layout('Your membership is confirmed 🎉', `
        <p>Welcome, <strong>${escapeHtml(member.full_name)}</strong>! Your registration is complete.</p>
        <table style="border-collapse:collapse;font-size:14px;">
          ${row('Membership ID', member.membership_id)}
          ${row('Tier', tier)}
          ${row('Category', member.membership_category || '—')}
          ${row('Payment reference', member.payment_reference)}
        </table>
        <p style="margin-top:20px;">
          <a href="${baseUrl}/member" style="background:#1F7A4D;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block;">
            Log in to the Member Portal
          </a>
        </p>
        <p style="color:#555;font-size:13px;">Use the email address and password you chose during registration.</p>
      `),
  });
}

// Sent when an admin approves a bank-transfer payment — the member's account
// switches from pending_review to paid and can now log in.
function sendPaymentApprovedEmail(member) {
  const { baseUrl } = getConfig();
  return sendEmail({
    to: member.email,
    subject: 'Zentriva payment approved — you can now log in',
    text:
      `Good news, ${member.full_name}! Your bank transfer payment has been verified and your membership is now active.\n\n` +
      `Log in to the member portal: ${baseUrl}/member\n`,
    html: layout('Payment approved ✅', `
      <p>Good news, <strong>${escapeHtml(member.full_name)}</strong>! Your bank transfer payment has been verified and your membership is now active.</p>
      <p style="margin-top:20px;">
        <a href="${baseUrl}/member" style="background:#1F7A4D;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block;">
          Log in to the Member Portal
        </a>
      </p>
    `),
  });
}

// Sent when an admin rejects a bank-transfer payment proof — the member's
// account stays locked pending correct proof.
function sendPaymentRejectedEmail(member) {
  return sendEmail({
    to: member.email,
    subject: 'Zentriva payment could not be verified',
    text:
      `Hi ${member.full_name},\n\nWe were unable to verify the payment proof submitted with your registration. ` +
      `Please contact support with a clear copy of your bank transfer receipt so we can complete your registration.\n`,
    html: layout('We could not verify your payment', `
      <p>Hi <strong>${escapeHtml(member.full_name)}</strong>,</p>
      <p>We were unable to verify the payment proof submitted with your registration. Please contact support with a clear copy of your bank transfer receipt so we can complete your registration.</p>
    `),
  });
}

// Password reset link (30-minute, single-use token).
function sendPasswordResetEmail(member, token) {
  const { baseUrl } = getConfig();
  const link = `${baseUrl}/member/reset?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to: member.email,
    subject: 'Reset your Zentriva portal password',
    text:
      `Hi ${member.full_name},\n\nReset your Zentriva member portal password using this link (valid for 30 minutes):\n${link}\n\n` +
      `If you didn't request this, you can ignore this email.\n`,
    html: layout('Reset your password', `
      <p>Hi <strong>${escapeHtml(member.full_name)}</strong>,</p>
      <p>We received a request to reset your member portal password. The link below is valid for <strong>30 minutes</strong> and can be used once.</p>
      <p style="margin-top:20px;">
        <a href="${link}" style="background:#1F7A4D;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block;">
          Choose a new password
        </a>
      </p>
      <p style="color:#555;font-size:13px;">If you didn't request this, you can safely ignore this email — your password is unchanged.</p>
    `),
  });
}

// Email-ownership verification link (24-hour, single-use token). Separate
// from sendRegistrationEmail: that email confirms the *payment*, this one
// confirms the member actually controls the inbox — required before login.
function sendVerificationEmail(member, token) {
  const { baseUrl } = getConfig();
  const link = `${baseUrl}/member/verify?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to: member.email,
    subject: 'Verify your email — Zentriva Member Portal',
    text:
      `Hi ${member.full_name},\n\nPlease verify your email address to activate your Zentriva member portal login (valid for 24 hours):\n${link}\n\n` +
      `If you didn't register with Zentriva, you can ignore this email.\n`,
    html: layout('Verify your email address', `
      <p>Hi <strong>${escapeHtml(member.full_name)}</strong>,</p>
      <p>One last step before you can log in to the member portal — confirm this is your email address. The link below is valid for <strong>24 hours</strong>.</p>
      <p style="margin-top:20px;">
        <a href="${link}" style="background:#1F7A4D;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block;">
          Verify Email Address
        </a>
      </p>
      <p style="color:#555;font-size:13px;">If you didn't register with Zentriva, you can safely ignore this email.</p>
    `),
  });
}

module.exports = {
  isEmailEnabled, sendEmail, sendRegistrationEmail, sendPasswordResetEmail,
  sendPaymentApprovedEmail, sendPaymentRejectedEmail, sendVerificationEmail,
  getReceivedEmail,
};
