// services/emailService.js
/**
 * Email service using Gmail API (HTTP/port 443) instead of SMTP.
 * Render free tier blocks SMTP ports 25, 465, 587 — Gmail API uses HTTPS,
 * which is always open.
 *
 * Required env vars:
 *   GMAIL_USER           - your Gmail address (e.g. you@gmail.com)
 *   GMAIL_CLIENT_ID      - OAuth2 Client ID from Google Cloud Console
 *   GMAIL_CLIENT_SECRET  - OAuth2 Client Secret
 *   GMAIL_REFRESH_TOKEN  - Refresh token from OAuth2 Playground
 *
 * Setup guide:
 *   1. Go to https://console.cloud.google.com → create/select project
 *   2. Enable "Gmail API"
 *   3. Create OAuth2 credentials (Desktop app type)
 *   4. Go to https://developers.google.com/oauthplayground
 *      → Set Client ID/Secret in the ⚙️ settings
 *      → Authorize scope: https://www.googleapis.com/auth/gmail.send
 *      → Exchange auth code for tokens → copy Refresh Token
 *   5. Add yourself as a "Test user" in OAuth consent screen
 */

const { google } = require('googleapis');

const GMAIL_ENABLED =
  process.env.GMAIL_USER &&
  process.env.GMAIL_CLIENT_ID &&
  process.env.GMAIL_CLIENT_SECRET &&
  process.env.GMAIL_REFRESH_TOKEN;

const getOAuth2Client = () => {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return oAuth2Client;
};

/**
 * Core send function — encodes the message as base64url and sends via Gmail API
 */
const sendEmail = async ({ to, subject, html }) => {
  if (!GMAIL_ENABLED) {
    console.warn(`[Email] Gmail not configured — skipping email to ${to}: "${subject}"`);
    return false;
  }

  try {
    const auth = getOAuth2Client();
    const gmail = google.gmail({ version: 'v1', auth });

    const rawMessage = [
      `To: ${to}`,
      `From: Airstream <${process.env.GMAIL_USER}>`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      html,
    ].join('\r\n');

    const encoded = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encoded },
    });

    console.log(`[Email] Sent to ${to}: "${subject}"`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err.message);
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Email templates
// ─────────────────────────────────────────────────────────────────────────────

const baseStyle = `
  body { margin:0; padding:0; background:#f4f4f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
  .wrap { max-width:580px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
  .header { background:#dc2626; padding:28px 32px; }
  .header h1 { margin:0; color:#fff; font-size:22px; font-weight:700; letter-spacing:-.3px; }
  .header p { margin:4px 0 0; color:#fca5a5; font-size:13px; }
  .body { padding:32px; }
  .body p { margin:0 0 16px; color:#374151; font-size:15px; line-height:1.6; }
  .btn { display:inline-block; background:#dc2626; color:#fff !important; text-decoration:none; padding:13px 28px; border-radius:8px; font-size:15px; font-weight:600; margin:8px 0 20px; }
  .meta { background:#f9fafb; border-radius:8px; padding:16px 20px; margin:20px 0; }
  .meta p { margin:0; color:#6b7280; font-size:13px; }
  .meta strong { color:#374151; }
  .warning { background:#fef3c7; border-left:4px solid #f59e0b; padding:12px 16px; border-radius:0 6px 6px 0; margin:16px 0; }
  .warning p { margin:0; color:#92400e; font-size:14px; }
  .danger { background:#fee2e2; border-left:4px solid #dc2626; padding:12px 16px; border-radius:0 6px 6px 0; margin:16px 0; }
  .danger p { margin:0; color:#991b1b; font-size:14px; }
  .footer { padding:20px 32px; border-top:1px solid #f3f4f6; }
  .footer p { margin:0; color:#9ca3af; font-size:12px; }
`;

/**
 * Welcome email — sent when a new user creates an account
 */
const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: '☁️ Welcome to Airstream!',
    html: `<!DOCTYPE html><html><head><style>${baseStyle}</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>☁️ Airstream</h1>
    <p>Your personal cloud storage</p>
  </div>
  <div class="body">
    <p>Hey <strong>${user.name || 'there'}</strong>,</p>
    <p>Welcome aboard! Your Airstream account has been created and you're all set to start uploading and managing your files.</p>
    <p>Here's what you get:</p>
    <div class="meta">
      <p>📁 &nbsp;<strong>5 GB</strong> of free storage</p>
      <p style="margin-top:8px">🔗 &nbsp;Shareable links for any file</p>
      <p style="margin-top:8px">📂 &nbsp;Folder organization</p>
      <p style="margin-top:8px">📤 &nbsp;Export &amp; import your data anytime</p>
    </div>
    <p>If you have any questions, just reply to this email.</p>
    <p style="margin-bottom:0">— The Airstream Team</p>
  </div>
  <div class="footer">
    <p>You're receiving this because you signed up at Airstream. This is your account: ${user.email}</p>
  </div>
</div>
</body></html>`,
  });

/**
 * Export ready email — sent when the export download link is generated
 */
const sendExportEmail = (user, downloadUrl, expiresAt) => {
  const expiryStr = new Date(expiresAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return sendEmail({
    to: user.email,
    subject: '📦 Your Airstream data export is ready',
    html: `<!DOCTYPE html><html><head><style>${baseStyle}</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>☁️ Airstream</h1>
    <p>Data export ready</p>
  </div>
  <div class="body">
    <p>Hey <strong>${user.name || 'there'}</strong>,</p>
    <p>Your Airstream data export is ready. Click the button below to download a ZIP archive containing all your files.</p>
    <a href="${downloadUrl}" class="btn">⬇️ Download Your Data</a>
    <div class="warning">
      <p>⏳ This link expires on <strong>${expiryStr}</strong>. Download your data before then.</p>
    </div>
    <div class="meta">
      <p><strong>What's included:</strong></p>
      <p style="margin-top:8px">• All your uploaded files</p>
      <p style="margin-top:8px">• A <code>manifest.json</code> with file metadata</p>
      <p style="margin-top:8px">• This ZIP can be used to import your data back into Airstream</p>
    </div>
    <p>If you didn't request this export, you can ignore this email — your account is safe.</p>
  </div>
  <div class="footer">
    <p>Requested for account: ${user.email}</p>
  </div>
</div>
</body></html>`,
  });
};

/**
 * Account deletion email — sent when a deletion is scheduled
 */
const sendDeletionEmail = (user, recoveryDeadline) => {
  const deadlineStr = new Date(recoveryDeadline).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return sendEmail({
    to: user.email,
    subject: '⚠️ Your Airstream account is scheduled for deletion',
    html: `<!DOCTYPE html><html><head><style>${baseStyle}</style></head><body>
<div class="wrap">
  <div class="header" style="background:#7f1d1d;">
    <h1>☁️ Airstream</h1>
    <p style="color:#fca5a5;">Account deletion scheduled</p>
  </div>
  <div class="body">
    <p>Hey <strong>${user.name || 'there'}</strong>,</p>
    <p>We've received a request to permanently delete your Airstream account. Your account has been scheduled for deletion.</p>
    <div class="danger">
      <p>🗑️ Deletion is scheduled — your account and all files will be <strong>permanently deleted on ${deadlineStr}</strong>.</p>
    </div>
    <p><strong>Changed your mind?</strong> You have 7 days to recover your account. Simply sign back in to Airstream before ${deadlineStr} and your account will be fully restored.</p>
    <div class="meta">
      <p><strong>What gets deleted:</strong></p>
      <p style="margin-top:8px">• Your account profile</p>
      <p style="margin-top:8px">• All uploaded files (cannot be recovered after deletion date)</p>
      <p style="margin-top:8px">• All shared links</p>
    </div>
    <p>If you didn't request this, sign in immediately to cancel the deletion.</p>
  </div>
  <div class="footer">
    <p>Account: ${user.email} &nbsp;|&nbsp; Deletion date: ${deadlineStr}</p>
  </div>
</div>
</body></html>`,
  });
};

module.exports = { sendEmail, sendWelcomeEmail, sendExportEmail, sendDeletionEmail };
