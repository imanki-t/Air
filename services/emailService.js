// services/emailService.js
/**
 * Email service using Gmail API (HTTPS) — works on Render free tier
 * which blocks SMTP ports 25 / 465 / 587.
 *
 * Key fixes vs previous version:
 *  - HTML body is base64-encoded so Content-Transfer-Encoding is correct.
 *    (Declaring CTE: quoted-printable but sending raw HTML broke download links.)
 *  - Subject is RFC 2047 encoded so non-ASCII never garbles in notifications.
 *  - Zero emoji in subjects or body — only inline SVGs.
 *
 * Required env vars:
 *   GMAIL_USER           — sender address  (e.g. noreply.airstream@gmail.com)
 *   GMAIL_CLIENT_ID      — OAuth2 Client ID   (Web Application type)
 *   GMAIL_CLIENT_SECRET  — OAuth2 Client Secret
 *   GMAIL_REFRESH_TOKEN  — refresh token from OAuth Playground
 */

const { google } = require('googleapis');

const GMAIL_ENABLED =
  process.env.GMAIL_USER &&
  process.env.GMAIL_CLIENT_ID &&
  process.env.GMAIL_CLIENT_SECRET &&
  process.env.GMAIL_REFRESH_TOKEN;

// ─── OAuth2 client ────────────────────────────────────────────────────────────
const getOAuth2Client = () => {
  const client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return client;
};

// ─── RFC 2047 subject encoder ─────────────────────────────────────────────────
// Wraps the subject in =?UTF-8?B?...?= so Unicode (or any emoji leftover)
// is transmitted safely and never garbles in phone notification previews.
const encodeSubject = (text) =>
  `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`;

// ─── Core send ────────────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  if (!GMAIL_ENABLED) {
    console.warn(`[Email] Gmail not configured — skipping email to ${to}: "${subject}"`);
    return false;
  }

  try {
    const auth  = getOAuth2Client();
    const gmail = google.gmail({ version: 'v1', auth });

    // Encode the HTML body as base64 — this is what makes the download button
    // work correctly. If you declare CTE: quoted-printable but send raw HTML,
    // email clients mangle every "=" sign in URLs (breaking signed download links).
    const bodyB64 = Buffer.from(html, 'utf8').toString('base64');

    const mime = [
      `To: ${to}`,
      `From: Airstream <${process.env.GMAIL_USER}>`,
      `Subject: ${encodeSubject(subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      bodyB64,
    ].join('\r\n');

    // The outer envelope is also base64url-encoded for the Gmail API raw field.
    const raw = Buffer.from(mime)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    console.log(`[Email] Sent to ${to}: "${subject}"`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err.message);
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared assets
// ─────────────────────────────────────────────────────────────────────────────

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 500 500">
  <rect width="500" height="500" rx="80" fill="#dc2626"/>
  <ellipse cx="250" cy="210" rx="130" ry="80" fill="#ffffff"/>
  <ellipse cx="170" cy="230" rx="75" ry="60" fill="#ffffff"/>
  <ellipse cx="330" cy="230" rx="75" ry="60" fill="#ffffff"/>
  <rect x="120" y="220" width="260" height="70" fill="#ffffff"/>
  <polyline points="155,288 250,330 345,288" fill="none" stroke="#dc2626" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const svg = {
  storage:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg>`,
  link:     `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  folder:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  clock:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  warning:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  trash:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  export:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  refresh:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.85"/></svg>`,
  file:     `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  profile:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Email shell — dark navy background + blue grid (matches app dark mode)
// ─────────────────────────────────────────────────────────────────────────────
const shell = ({ subtitle, accentColor = '#dc2626', accentDark = '#b91c1c', body }) => `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>Airstream</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0f172a;
      background-image:
        linear-gradient(rgba(59,130,246,0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59,130,246,0.07) 1px, transparent 1px);
      background-size: 28px 28px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      padding: 40px 16px 60px;
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
    }
    .wrapper { max-width: 560px; margin: 0 auto; }
    .card {
      background: #1e293b;
      border-radius: 18px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.07);
      box-shadow: 0 0 0 1px rgba(0,0,0,0.3), 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(220,38,38,0.08);
    }
    .header {
      background: linear-gradient(135deg, ${accentColor} 0%, ${accentDark} 100%);
      padding: 28px 32px 24px;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px);
      background-size: 22px 22px;
    }
    .header-inner { position: relative; z-index: 1; display: flex; align-items: center; gap: 14px; }
    .header-text h1 { color: #fff; font-size: 20px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; line-height: 1.2; }
    .header-text p { color: rgba(255,255,255,0.65); font-size: 12px; font-weight: 500; margin-top: 3px; letter-spacing: 0.03em; }
    .body { padding: 32px; }
    .body p { color: #cbd5e1; font-size: 15px; line-height: 1.65; margin-bottom: 18px; }
    .body p:last-child { margin-bottom: 0; }
    .body strong { color: #f1f5f9; }
    .section-label { color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
    .info-grid { background: #0f172a; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 6px 0; margin: 16px 0 20px; }
    .info-row { display: flex; align-items: flex-start; gap: 12px; padding: 11px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .info-row:last-child { border-bottom: none; }
    .info-icon { flex-shrink: 0; width: 28px; height: 28px; border-radius: 7px; background: rgba(220,38,38,0.12); display: flex; align-items: center; justify-content: center; margin-top: 1px; }
    .info-text { color: #94a3b8; font-size: 13.5px; line-height: 1.55; padding-top: 5px; }
    .info-text strong { color: #e2e8f0; }
    .btn-wrap { text-align: center; margin: 24px 0 8px; }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, ${accentColor} 0%, ${accentDark} 100%);
      color: #ffffff !important;
      text-decoration: none !important;
      padding: 14px 40px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.03em;
      box-shadow: 0 4px 20px rgba(220,38,38,0.35);
    }
    .btn-sub { color: #475569; font-size: 11px; text-align: center; margin-top: 8px; margin-bottom: 4px; }
    .banner { border-radius: 10px; padding: 14px 16px; margin: 16px 0; display: flex; align-items: flex-start; gap: 12px; }
    .banner-warn { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.25); }
    .banner-warn .btext { color: #fcd34d; font-size: 13.5px; line-height: 1.55; }
    .banner-warn .btext strong { color: #fde68a; }
    .banner-danger { background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.25); }
    .banner-danger .btext { color: #fca5a5; font-size: 13.5px; line-height: 1.55; }
    .banner-danger .btext strong { color: #fecaca; }
    .bicon { flex-shrink: 0; margin-top: 2px; }
    .divider { height: 1px; background: rgba(255,255,255,0.06); margin: 24px 0; }
    .footer { padding: 18px 32px 24px; border-top: 1px solid rgba(255,255,255,0.06); }
    .footer p { color: #475569; font-size: 12px; line-height: 1.6; }
    @media (max-width: 600px) {
      body { padding: 20px 12px 40px; }
      .header { padding: 22px 20px 18px; }
      .body { padding: 24px 20px; }
      .footer { padding: 16px 20px 20px; }
      .btn { padding: 13px 28px; font-size: 14px; }
    }
  </style>
</head>
<body>
<div class="wrapper"><div class="card">
  <div class="header">
    <div class="header-inner">
      <div>${logoSvg}</div>
      <div class="header-text"><h1>Airstream</h1><p>${subtitle}</p></div>
    </div>
  </div>
  <div class="body">${body}</div>
</div></div>
</body>
</html>`;

const infoRow = (iconSvg, text) =>
  `<div class="info-row"><div class="info-icon">${iconSvg}</div><div class="info-text">${text}</div></div>`;

// ─────────────────────────────────────────────────────────────────────────────
// Welcome email
// ─────────────────────────────────────────────────────────────────────────────
const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: 'Welcome to Airstream — your personal cloud storage',
    html: shell({
      subtitle: 'Your personal cloud storage',
      body: `
        <p>Hey <strong>${user.name || 'there'}</strong>,</p>
        <p>Welcome aboard. Your Airstream account is ready — start uploading, organising, and sharing your files right away.</p>
        <p class="section-label">What is included</p>
        <div class="info-grid">
          ${infoRow(svg.storage, '<strong>5 GB</strong> of free storage — no credit card required')}
          ${infoRow(svg.link,    '<strong>Shareable links</strong> for any file, instantly')}
          ${infoRow(svg.folder,  '<strong>Folder organisation</strong> with custom colours')}
          ${infoRow(svg.export,  '<strong>Export and import</strong> your data any time')}
        </div>
        <p>If you have any questions, simply reply to this email.</p>
        <p style="color:#475569;font-size:14px;">— The Airstream Team</p>
        <div class="divider"></div>
        <div class="footer">
          <p>You received this because you created an account with <strong style="color:#64748b;">${user.email}</strong>.</p>
        </div>
      `,
    }),
  });

// ─────────────────────────────────────────────────────────────────────────────
// Export ready email
// ─────────────────────────────────────────────────────────────────────────────
const sendExportEmail = (user, downloadUrl, expiresAt) => {
  const expiryStr = new Date(expiresAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return sendEmail({
    to: user.email,
    subject: 'Your Airstream data export is ready to download',
    html: shell({
      subtitle: 'Data export ready',
      body: `
        <p>Hey <strong>${user.name || 'there'}</strong>,</p>
        <p>Your Airstream data export has been prepared. Click the button below to download a ZIP archive of all your files.</p>
        <div class="btn-wrap">
          <a href="${downloadUrl}" class="btn">Download Your Data</a>
          <p class="btn-sub">Opens a direct ZIP download</p>
        </div>
        <div class="banner banner-warn">
          <div class="bicon">${svg.clock}</div>
          <div class="btext">This link expires on <strong>${expiryStr}</strong>. Download before then.</div>
        </div>
        <p class="section-label">What is included</p>
        <div class="info-grid">
          ${infoRow(svg.folder,  'All your uploaded files')}
          ${infoRow(svg.file,    'A <strong>manifest.json</strong> with file metadata')}
          ${infoRow(svg.refresh, 'This ZIP can be reimported back into Airstream')}
        </div>
        <p style="color:#64748b;font-size:13.5px;">If you did not request this export, you can safely ignore this email — your account is untouched.</p>
        <div class="divider"></div>
        <div class="footer">
          <p>Requested for account: <strong style="color:#64748b;">${user.email}</strong></p>
        </div>
      `,
    }),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Account deletion email
// ─────────────────────────────────────────────────────────────────────────────
const sendDeletionEmail = (user, recoveryDeadline) => {
  const deadlineStr = new Date(recoveryDeadline).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return sendEmail({
    to: user.email,
    subject: 'Your Airstream account has been scheduled for deletion',
    html: shell({
      subtitle: 'Account deletion scheduled',
      accentColor: '#991b1b',
      accentDark: '#7f1d1d',
      body: `
        <p>Hey <strong>${user.name || 'there'}</strong>,</p>
        <p>We received a request to permanently delete your Airstream account. Your account has been scheduled for deletion.</p>
        <div class="banner banner-danger">
          <div class="bicon">${svg.warning}</div>
          <div class="btext">Your account and all files will be <strong>permanently deleted on ${deadlineStr}</strong>.</div>
        </div>
        <p><strong>Changed your mind?</strong> You have 7 days to recover your account. Simply sign back in before <strong>${deadlineStr}</strong> and everything will be fully restored.</p>
        <p class="section-label">What gets deleted</p>
        <div class="info-grid">
          ${infoRow(svg.profile, 'Your account profile')}
          ${infoRow(svg.storage, 'All uploaded files <strong>(cannot be recovered after the deadline)</strong>')}
          ${infoRow(svg.link,    'All shared links')}
          ${infoRow(svg.trash,   'Deletion is permanent — there is no undo after 7 days')}
        </div>
        <p style="color:#64748b;font-size:13.5px;">If you did not request this deletion, sign in immediately — your account will be automatically restored.</p>
        <div class="divider"></div>
        <div class="footer">
          <p>Account: <strong style="color:#64748b;">${user.email}</strong> &nbsp;&middot;&nbsp; Deletion date: <strong style="color:#64748b;">${deadlineStr}</strong></p>
        </div>
      `,
    }),
  });
};

module.exports = { sendEmail, sendWelcomeEmail, sendExportEmail, sendDeletionEmail };
