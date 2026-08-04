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
 *  - Black & white design system across every email — single visual language,
 *    no per-email accent colors.
 *  - Device/browser/location fields are only ever as good as the ip/userAgent
 *    the caller passes in — see routes/authRoutes.js call sites.
 *
 * Required env vars:
 *   GMAIL_USER           — sender address  (e.g. noreply.airstream@gmail.com)
 *   GMAIL_CLIENT_ID      — OAuth2 Client ID   (Web Application type)
 *   GMAIL_CLIENT_SECRET  — OAuth2 Client Secret
 *   GMAIL_REFRESH_TOKEN  — refresh token from OAuth Playground
 */

const { google } = require('googleapis');
const axios = require('axios');

const isGmailConfigured = () =>
  Boolean(
    process.env.GMAIL_USER &&
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN
  );

// ─── Startup config check ─────────────────────────────────────────────────────
// Log clearly at startup so deployment logs show whether email is functional.
if (isGmailConfigured()) {
  console.log('[Email] Gmail API configured — emails will be sent via', process.env.GMAIL_USER);
} else {
  const missing = ['GMAIL_USER', 'GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN']
    .filter((k) => !process.env[k]);
  console.warn(
    `[Email] Gmail NOT configured — missing env var(s): ${missing.join(', ')}. ` +
    'All emails will be silently skipped until these are set.'
  );
}

// ─── OAuth2 client ────────────────────────────────────────────────────────────
const getOAuth2Client = () => {
  const client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
  );
  client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return client;
};

// ─── RFC 2047 subject encoder ─────────────────────────────────────────────────
// Wraps the subject in =?UTF-8?B?...?= so Unicode (or any emoji leftover)
// is transmitted safely and never garbles in phone notification previews.
const encodeSubject = (text) =>
  `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`;

// ─── HTML escape helper ─────────────────────────────────────────────────────
// user.name and user.email come from Google OAuth, but we defensively escape
// them before inserting into HTML to prevent any injection if Google's payload
// ever contains special characters or if the values are changed in the DB.
const escHtml = (str) =>
  String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ─── Core send ────────────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  if (!isGmailConfigured()) {
    console.warn(`[Email] Gmail not configured (missing env vars: GMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, or GMAIL_REFRESH_TOKEN) — skipping email to ${to}: "${subject}"`);
    return false;
  }

  try {
    const auth  = getOAuth2Client();

    // Explicitly refresh the access token before sending. This catches expired
    // or revoked refresh tokens early with a clear error message, instead of
    // letting the Gmail API call fail with a cryptic 401.
    try {
      await auth.getAccessToken();
    } catch (tokenErr) {
      const msg = tokenErr.message || '';
      if (msg.includes('invalid_grant') || msg.includes('Token has been expired or revoked')) {
        console.error(
          `[Email] CRITICAL: Gmail refresh token is expired or revoked. ` +
          `Re-generate GMAIL_REFRESH_TOKEN via OAuth Playground. ` +
          `Skipping email to ${to}: "${subject}"`
        );
      } else {
        console.error(`[Email] Failed to obtain access token: ${msg}. Skipping email to ${to}: "${subject}"`);
      }
      return false;
    }

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
    // Provide more specific error messages for common failure modes
    const msg = err.message || '';
    if (err.code === 403 || msg.includes('insufficient')) {
      console.error(
        `[Email] Gmail API permission denied (403). Ensure the Gmail API is enabled ` +
        `in Google Cloud Console and the sender account has granted access. ` +
        `Error: ${msg}`
      );
    } else if (err.code === 401 || msg.includes('invalid_grant')) {
      console.error(
        `[Email] Gmail authentication failed (401). The refresh token may be ` +
        `expired or revoked. Re-generate GMAIL_REFRESH_TOKEN. Error: ${msg}`
      );
    } else {
      console.error(`[Email] Failed to send to ${to}: ${msg}`);
    }
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared assets — monochrome design system. Every icon is a single stroke
// color (#18181b) so the whole email suite reads as one consistent,
// black-and-white, professional product — no per-email accent colors.
// ─────────────────────────────────────────────────────────────────────────────

const INK = '#18181b';

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="45" fill="none" stroke="#ffffff" stroke-width="6"/>
  <circle cx="50" cy="33" r="6.5" fill="#ffffff"/>
  <polyline points="29,44 50,68 71,44" fill="none" stroke="#ffffff" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const svg = {
  profile:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  mobile:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>`,
  tablet:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  laptop:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="1.5"/><line x1="2" y1="20" x2="22" y2="20" stroke-linecap="round"/></svg>`,
  browser:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><circle cx="6.5" cy="6.5" r="0.6" fill="${INK}" stroke="none"/><circle cx="9.3" cy="6.5" r="0.6" fill="${INK}" stroke="none"/></svg>`,
  globe:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  pin:      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  clock:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  folder:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  file:     `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  storage:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg>`,
  trash:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  export:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  refresh:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.85"/></svg>`,
  warning:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  shield:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  lock:     `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
};

// White-on-black versions of the icons used inside `.banner-alert` (which has
// a solid black icon chip), so the glyph stays visible against a dark backdrop.
const svgOnDark = (name) => {
  const map = {
    warning: svg.warning,
    shield:  svg.shield,
    mobile:  svg.mobile,
    laptop:  svg.laptop,
    tablet:  svg.tablet,
  };
  return (map[name] || svg.warning).replace(new RegExp(INK, 'g'), '#ffffff');
};

// ─────────────────────────────────────────────────────────────────────────────
// Email shell — white card on light-gray background, solid black header,
// monochrome throughout. One visual language for every email Airstream sends.
// ─────────────────────────────────────────────────────────────────────────────
const shell = ({ subtitle, body }) => `<!DOCTYPE html>
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
      background-color: #f4f4f5;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      padding: 40px 16px 60px;
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
      color: #18181b;
    }
    .wrapper { max-width: 560px; margin: 0 auto; }
    .card {
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e4e4e7;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 16px 40px rgba(0,0,0,0.08);
    }
    .header { background: #000000; padding: 28px 32px 24px; }
    .header-inner { display: flex; align-items: center; gap: 14px; }
    .header-text h1 { color: #ffffff; font-size: 19px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; line-height: 1.2; }
    .header-text p { color: #a1a1aa; font-size: 12px; font-weight: 500; margin-top: 4px; letter-spacing: 0.02em; }
    .body { padding: 32px; }
    .body p { color: #3f3f46; font-size: 15px; line-height: 1.65; margin-bottom: 18px; }
    .body p:last-child { margin-bottom: 0; }
    .body strong { color: #000000; }
    .section-label { color: #71717a; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 22px 0 10px; }
    .section-label:first-child { margin-top: 0; }
    .info-grid { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 12px; padding: 6px 0; margin: 0 0 4px; }
    .info-row { display: flex; align-items: flex-start; gap: 12px; padding: 11px 16px; border-bottom: 1px solid #ececee; min-width: 0; }
    .info-row:last-child { border-bottom: none; }
    .info-icon { flex-shrink: 0; width: 28px; height: 28px; border-radius: 7px; background: #ffffff; border: 1px solid #e4e4e7; text-align: center; line-height: 26px; margin-top: 1px; }
    .info-icon svg { display: inline-block; vertical-align: middle; width: 15px; height: 15px; }
    .info-text { color: #52525b; font-size: 13.5px; line-height: 1.55; padding-top: 5px; min-width: 0; word-break: break-word; overflow-wrap: anywhere; }
    .info-text strong { color: #18181b; }
    .btn-wrap { text-align: center; margin: 26px 0 6px; }
    .btn { display: inline-block; background: #000000; color: #ffffff !important; text-decoration: none !important; padding: 14px 40px; border-radius: 10px; font-size: 15px; font-weight: 700; letter-spacing: 0.03em; box-shadow: 0 4px 14px rgba(0,0,0,0.25); }
    .btn-sub { color: #a1a1aa; font-size: 11px; text-align: center; margin-top: 9px; margin-bottom: 4px; }

    /* Password / secret value box — deliberately NOT a flex row, so a long
       unbroken token can never push the card wider than the viewport. */
    .pass-box { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 10px; padding: 16px 18px; margin: 18px 0; }
    .pass-label { display: flex; align-items: center; gap: 8px; color: #3f3f46; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
    .pass-label svg { display: block; }
    .pass-value {
      display: block;
      width: 100%;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 14px;
      color: #000000;
      background: #ffffff;
      border: 1px solid #d4d4d8;
      border-radius: 8px;
      padding: 12px 14px;
      word-break: break-all;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      line-height: 1.5;
      letter-spacing: 0.02em;
    }
    .pass-hint { color: #a1a1aa; font-size: 12px; margin-top: 10px; }

    .banner { border-radius: 10px; padding: 14px 16px; margin: 16px 0; display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
    .banner-note { background: #fafafa; border: 1px solid #e4e4e7; }
    .banner-note .btext { color: #3f3f46; }
    .banner-note .btext strong { color: #000000; }
    .banner-alert { background: #0a0a0a; border: 1px solid #000000; }
    .banner-alert .btext { color: #d4d4d8; }
    .banner-alert .btext strong { color: #ffffff; }
    .banner-alert .bicon-box { background: #18181b; border-color: #27272a; }
    .btext { font-size: 13.5px; line-height: 1.55; min-width: 0; word-break: break-word; overflow-wrap: anywhere; padding-top: 3px; }
    .bicon-box { flex-shrink: 0; width: 28px; height: 28px; border-radius: 7px; background: #ffffff; border: 1px solid #e4e4e7; text-align: center; line-height: 26px; margin-top: 1px; }
    .bicon-box svg { display: inline-block; vertical-align: middle; width: 15px; height: 15px; }

    .divider { height: 1px; background: #e4e4e7; margin: 24px 0; }
    .footer { padding: 18px 32px 24px; border-top: 1px solid #e4e4e7; }
    .footer p { color: #a1a1aa; font-size: 12px; line-height: 1.6; word-break: break-word; overflow-wrap: anywhere; }
    .footer strong { color: #71717a; }

    @media (max-width: 600px) {
      body { padding: 20px 12px 40px; }
      .header { padding: 22px 20px 18px; }
      .body { padding: 24px 20px; }
      .footer { padding: 16px 20px 20px; }
      .btn { padding: 13px 24px; font-size: 14px; width: 100%; }
      .btn-wrap { width: 100%; }
      .pass-value { font-size: 12.5px; padding: 11px 12px; }
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

// ─────────────────────────────────────────────────────────────────────────────
// Device, UA parser, geolocation & timestamp helpers
// ─────────────────────────────────────────────────────────────────────────────

// Parses a User-Agent string into a model/OS/browser/device-type breakdown,
// and picks the matching icon key ('mobile' | 'tablet' | 'laptop') so the
// email always shows an icon that actually matches the device — instead of
// the previous version, which showed an unrelated storage-cylinder icon for
// every device regardless of type.
const parseDeviceInfo = (userAgent = '') => {
  const ua = String(userAgent || '').trim();

  if (!ua || ua === 'Unknown Device') {
    return {
      deviceName: 'Unknown Device',
      deviceType: 'Unknown',
      browser: 'Unknown Browser',
      os: 'Unknown System',
      icon: 'laptop',
    };
  }

  let os = 'Unknown System';
  let deviceType = 'Desktop';
  let icon = 'laptop';
  let model = '';
  let m;

  if (/iPhone/i.test(ua)) {
    deviceType = 'Mobile'; icon = 'mobile'; model = 'iPhone';
    m = ua.match(/iPhone OS (\d+)[_.](\d+)/i);
    os = m ? `iOS ${m[1]}.${m[2]}` : 'iOS';
  } else if (/iPad/i.test(ua)) {
    deviceType = 'Tablet'; icon = 'tablet'; model = 'iPad';
    m = ua.match(/(?:CPU OS|OS) (\d+)[_.](\d+)/i);
    os = m ? `iPadOS ${m[1]}.${m[2]}` : 'iPadOS';
  } else if (/Android/i.test(ua)) {
    m = ua.match(/Android\s([\d.]+)/i);
    os = m ? `Android ${m[1]}` : 'Android';
    deviceType = /Mobile/i.test(ua) ? 'Mobile' : 'Tablet';
    icon = deviceType === 'Mobile' ? 'mobile' : 'tablet';
    // Model sits between "Android X.Y;" and either "Build/" or the closing ")",
    // e.g. "Android 14; SM-A536E Build/..." or "Android 14; Pixel 8)"
    const modelMatch = ua.match(/Android\s[\d.]+;\s*([^;)]+?)(?:\s?Build\/|\))/i);
    model = modelMatch ? modelMatch[1].trim() : 'Android Device';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceType = 'Desktop'; icon = 'laptop'; model = 'Mac';
    m = ua.match(/Mac OS X (\d+)[_.](\d+)/i);
    os = m ? `macOS ${m[1]}.${m[2]}` : 'macOS';
  } else if (/Windows NT/i.test(ua)) {
    deviceType = 'Desktop'; icon = 'laptop'; model = 'Windows PC';
    const winMap = { '10.0': 'Windows 10 / 11', '6.3': 'Windows 8.1', '6.2': 'Windows 8', '6.1': 'Windows 7' };
    m = ua.match(/Windows NT ([\d.]+)/i);
    os = m ? (winMap[m[1]] || `Windows NT ${m[1]}`) : 'Windows';
  } else if (/CrOS/i.test(ua)) {
    deviceType = 'Desktop'; icon = 'laptop'; model = 'Chromebook'; os = 'ChromeOS';
  } else if (/Linux/i.test(ua)) {
    deviceType = 'Desktop'; icon = 'laptop'; model = 'Linux Workstation'; os = 'Linux';
  }

  let browser = 'Unknown Browser';
  if (/EdgA|Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/CriOS/i.test(ua)) browser = 'Chrome (iOS)';
  else if (/FxiOS/i.test(ua)) browser = 'Firefox (iOS)';
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Google Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) browser = 'Apple Safari';

  const deviceName = model && model !== os ? `${model} — ${os}` : os;

  return { deviceName, deviceType, browser, os, model: model || os, icon };
};

const formatTimestamp = (date = new Date()) => {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
};

const getIpGeoLocation = async (ip = '') => {
  const cleanIp = String(ip || '').replace(/^::ffff:/, '').replace(/^\[|\]$/g, '').trim();
  if (!cleanIp || cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('10.') || cleanIp.startsWith('192.168.')) {
    return {
      ipNumber: cleanIp || 'Not available',
      location: 'Local / Internal Network',
    };
  }

  try {
    const res = await axios.get(`http://ip-api.com/json/${cleanIp}`, { timeout: 2500 });
    if (res.data && res.data.status === 'success') {
      const city = res.data.city || '';
      const region = res.data.regionName || '';
      const country = res.data.country || '';
      const locationParts = [city, region, country].filter(Boolean);
      return {
        ipNumber: cleanIp,
        location: locationParts.join(', ') || 'Unknown Location',
      };
    }
  } catch (_) {}

  return {
    ipNumber: cleanIp,
    location: 'Location Unavailable',
  };
};

const infoRow = (iconSvg, text) =>
  `<div class="info-row"><div class="info-icon">${iconSvg}</div><div class="info-text">${text}</div></div>`;

// Standard 5-row "Request & Device Details" block reused across every email
// that reports on a request — keeps device/browser/IP rows identical
// everywhere instead of drifting per email.
const deviceDetailRows = (user, device, geo, timeStr, timeLabel = 'Timestamp') => `
  ${infoRow(svg.profile,        `<strong>Recipient Email:</strong> ${escHtml(user.email)}`)}
  ${infoRow(svg[device.icon],   `<strong>Device:</strong> ${escHtml(device.deviceName)}`)}
  ${infoRow(svg.browser,        `<strong>Browser:</strong> ${escHtml(device.browser)}`)}
  ${infoRow(svg.globe,          `<strong>IP Address:</strong> ${escHtml(geo.ipNumber)}`)}
  ${infoRow(svg.pin,            `<strong>Location:</strong> ${escHtml(geo.location)}`)}
  ${infoRow(svg.clock,          `<strong>${escHtml(timeLabel)}:</strong> ${escHtml(timeStr)}`)}
`;

// ─────────────────────────────────────────────────────────────────────────────
// Welcome email
// ─────────────────────────────────────────────────────────────────────────────
const sendWelcomeEmail = async (user, ip = '', userAgent = '') => {
  const device = parseDeviceInfo(userAgent);
  const geo = await getIpGeoLocation(ip);
  const timeStr = formatTimestamp();

  return sendEmail({
    to: user.email,
    subject: 'Welcome to Airstream — your personal cloud storage',
    html: shell({
      subtitle: 'Your personal cloud storage',
      body: `
        <p>Hey <strong>${escHtml(user.name) || 'there'}</strong>,</p>
        <p>Welcome aboard. Your Airstream account is ready — start uploading, organising, and sharing your files right away.</p>
        <p class="section-label">Account &amp; Sign-In Details</p>
        <div class="info-grid">
          ${deviceDetailRows(user, device, geo, timeStr, 'Signed up')}
        </div>
        <p class="section-label">What is included</p>
        <div class="info-grid">
          ${infoRow(svg.storage, '<strong>Your Google Drive storage</strong> — uses your own Drive account, no extra limits')}
          ${infoRow(svg.globe,   '<strong>Shareable links</strong> for any file, instantly')}
          ${infoRow(svg.folder,  '<strong>Folder organisation</strong> with custom colours')}
          ${infoRow(svg.export,  '<strong>Export and import</strong> your data any time')}
        </div>
        <p>If you have any questions, simply reply to this email.</p>
        <p style="color:#71717a;font-size:14px;">— The Airstream Team</p>
        <div class="divider"></div>
        <div class="footer">
          <p>Account: <strong>${escHtml(user.email)}</strong> &nbsp;&middot;&nbsp; Signed up: <strong>${escHtml(timeStr)}</strong></p>
        </div>
      `,
    }),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Export ready email
// ─────────────────────────────────────────────────────────────────────────────
const sendExportEmail = async (user, downloadUrl, expiresAt, exportPassword, ip = '', userAgent = '') => {
  const expiryStr = formatTimestamp(expiresAt);
  const device = parseDeviceInfo(userAgent);
  const geo = await getIpGeoLocation(ip);
  const timeStr = formatTimestamp();

  return sendEmail({
    to: user.email,
    subject: 'Your Airstream data export is ready to download',
    html: shell({
      subtitle: 'Data export ready',
      body: `
        <p>Hey <strong>${escHtml(user.name) || 'there'}</strong>,</p>
        <p>Your Airstream data export has been prepared. Click the button below to download your password-protected ZIP archive.</p>
        <div class="btn-wrap">
          <a href="${downloadUrl}" class="btn">Download Your Data</a>
          <p class="btn-sub">Opens a direct ZIP download</p>
        </div>
        ${exportPassword ? `
        <div class="pass-box">
          <div class="pass-label">${svg.lock}<span>ZIP Archive Password</span></div>
          <span class="pass-value">${escHtml(exportPassword)}</span>
          <p class="pass-hint">You'll need this password to open the downloaded ZIP file. It won't fit on one line on a phone screen — that's expected, just copy the whole thing.</p>
        </div>
        ` : ''}
        <div class="banner banner-note">
          <div class="bicon-box">${svg.clock}</div>
          <div class="btext">This link expires on <strong>${expiryStr}</strong>. Download before then.</div>
        </div>
        <p class="section-label">Request &amp; Device Details</p>
        <div class="info-grid">
          ${deviceDetailRows(user, device, geo, timeStr)}
        </div>
        <p class="section-label">What is included</p>
        <div class="info-grid">
          ${infoRow(svg.folder,  'All your uploaded files (AES-256 encrypted)')}
          ${infoRow(svg.file,    'A <strong>manifest.json</strong> with file metadata')}
          ${infoRow(svg.refresh, 'This ZIP can be reimported back into Airstream')}
        </div>
        <p style="color:#71717a;font-size:13.5px;">If you did not request this export, you can safely ignore this email — your account is untouched.</p>
        <div class="divider"></div>
        <div class="footer">
          <p>Requested for account: <strong>${escHtml(user.email)}</strong> &nbsp;&middot;&nbsp; ${escHtml(timeStr)}</p>
        </div>
      `,
    }),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Account deletion email
// ─────────────────────────────────────────────────────────────────────────────
const sendDeletionEmail = async (user, recoveryDeadline, ip = '', userAgent = '') => {
  const deadlineStr = formatTimestamp(recoveryDeadline);
  const device = parseDeviceInfo(userAgent);
  const geo = await getIpGeoLocation(ip);
  const timeStr = formatTimestamp();

  return sendEmail({
    to: user.email,
    subject: 'Your Airstream account has been scheduled for deletion',
    html: shell({
      subtitle: 'Account deletion scheduled',
      body: `
        <p>Hey <strong>${escHtml(user.name) || 'there'}</strong>,</p>
        <p>We received a request to permanently delete your Airstream account. Your account has been scheduled for deletion.</p>
        <div class="banner banner-alert">
          <div class="bicon-box">${svgOnDark('warning')}</div>
          <div class="btext">Your account and all files will be <strong>permanently deleted on ${deadlineStr}</strong>.</div>
        </div>
        <p><strong>Changed your mind?</strong> You have 7 days to recover your account. Simply sign back in before <strong>${deadlineStr}</strong> and everything will be fully restored.</p>
        <p class="section-label">Request &amp; Device Details</p>
        <div class="info-grid">
          ${deviceDetailRows(user, device, geo, timeStr, 'Request Time')}
        </div>
        <p class="section-label">What gets deleted</p>
        <div class="info-grid">
          ${infoRow(svg.profile, 'Your account profile')}
          ${infoRow(svg.storage, 'All uploaded files <strong>(cannot be recovered after the deadline)</strong>')}
          ${infoRow(svg.globe,   'All shared links')}
          ${infoRow(svg.trash,   'Deletion is permanent — there is no undo after 7 days')}
        </div>
        <p style="color:#71717a;font-size:13.5px;">If you did not request this deletion, sign in immediately — your account will be automatically restored.</p>
        <div class="divider"></div>
        <div class="footer">
          <p>Account: <strong>${escHtml(user.email)}</strong> &nbsp;&middot;&nbsp; Deletion deadline: <strong>${deadlineStr}</strong></p>
        </div>
      `,
    }),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Security: New IP detected email
// ─────────────────────────────────────────────────────────────────────────────
const sendNewIpAlertEmail = async (user, ip, userAgent) => {
  const device = parseDeviceInfo(userAgent);
  const geo = await getIpGeoLocation(ip);
  const timeStr = formatTimestamp();

  return sendEmail({
    to: user.email,
    subject: 'Security Alert: New IP address signed in to your Airstream account',
    html: shell({
      subtitle: 'Security Alert — New IP Detected',
      body: `
        <p>Hey <strong>${escHtml(user.name) || 'there'}</strong>,</p>
        <p>We detected a sign-in to your Airstream account from a new IP address.</p>
        <div class="banner banner-alert">
          <div class="bicon-box">${svgOnDark('shield')}</div>
          <div class="btext">New IP &amp; Location: <strong>${escHtml(geo.ipNumber)} (${escHtml(geo.location)})</strong></div>
        </div>
        <p class="section-label">Sign-In &amp; Security Details</p>
        <div class="info-grid">
          ${deviceDetailRows(user, device, geo, timeStr)}
        </div>
        <p style="color:#71717a;font-size:13.5px;">If this was you, you can safely ignore this alert. If you did not sign in recently, please secure your account immediately.</p>
        <div class="divider"></div>
        <div class="footer">
          <p>Security notification sent to: <strong>${escHtml(user.email)}</strong> &nbsp;&middot;&nbsp; ${escHtml(timeStr)}</p>
        </div>
      `,
    }),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Security: New Device detected email
// ─────────────────────────────────────────────────────────────────────────────
const sendNewDeviceAlertEmail = async (user, deviceName, userAgent, ip) => {
  const device = parseDeviceInfo(userAgent);
  const geo = await getIpGeoLocation(ip);
  const timeStr = formatTimestamp();
  const displayDevice = deviceName && deviceName !== 'New Device/Browser' ? deviceName : device.deviceName;

  return sendEmail({
    to: user.email,
    subject: 'Security Alert: New device logged in to your Airstream account',
    html: shell({
      subtitle: 'Security Alert — New Device Logged In',
      body: `
        <p>Hey <strong>${escHtml(user.name) || 'there'}</strong>,</p>
        <p>A new device was used to log into your Airstream account.</p>
        <div class="banner banner-alert">
          <div class="bicon-box">${svgOnDark(device.icon)}</div>
          <div class="btext">Device Detected: <strong>${escHtml(displayDevice)}</strong></div>
        </div>
        <p class="section-label">Login Details</p>
        <div class="info-grid">
          ${deviceDetailRows(user, device, geo, timeStr)}
        </div>
        <p style="color:#71717a;font-size:13.5px;">If you recognize this device, no action is needed. If you did not log in from this device, please protect your Google account immediately.</p>
        <div class="divider"></div>
        <div class="footer">
          <p>Security notification sent to: <strong>${escHtml(user.email)}</strong> &nbsp;&middot;&nbsp; ${escHtml(timeStr)}</p>
        </div>
      `,
    }),
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendExportEmail,
  sendDeletionEmail,
  sendNewIpAlertEmail,
  sendNewDeviceAlertEmail,
};
