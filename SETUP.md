# Backend Setup

## 1. Prerequisites

- Node.js 18 or later
- A MongoDB connection string ([Atlas](https://www.mongodb.com/atlas) free
  tier works fine, or a local `mongod`)
- A Google Cloud project with:
  - OAuth 2.0 Client ID (Web application type)
  - Google Drive API **enabled**
  - OAuth consent screen configured with the `drive.file` scope
- (Optional but recommended) A Gmail account for sending transactional email
- (Optional but recommended) A reCAPTCHA secret key

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

```bash
cp .env.example .env
```

### Core (required)

| Variable | Description |
|---|---|
| `PORT` | Port to listen on. Defaults to `5000` if unset. |
| `NODE_ENV` | `development` or `production`. |
| `MONGO_URI` | MongoDB connection string. |
| `JWT_SECRET` | Random secret used to sign session JWTs. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. |
| `FRONTEND_URL` | Exact origin of your frontend (e.g. `http://localhost:5173`). Used for CORS and Socket.IO — must match exactly, no trailing slash. |
| `BACKEND_URL` | Public URL of this backend itself (used to build absolute links, e.g. in emails). |
| `GOOGLE_CLIENT_ID` | Same OAuth Client ID as the frontend's `VITE_GOOGLE_CLIENT_ID`. |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret for the same Client ID. Needed to exchange authorization codes for Drive tokens. |
| `DRIVE_TOKEN_ENCRYPTION_KEY` | 32-byte, base64-encoded key used to encrypt Google Drive refresh tokens before they're stored in MongoDB. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. **Keep this outside your database/backups** — losing it means every user has to reconnect Drive; leaking it alongside a DB dump defeats the point of encrypting. |

### Email (optional — needed for welcome emails, data export links)

| Variable | Description |
|---|---|
| `GMAIL_USER` | The sending Gmail address. |
| `GMAIL_CLIENT_ID` | OAuth2 Client ID authorized for the Gmail API (can reuse the same Google Cloud project). |
| `GMAIL_CLIENT_SECRET` | OAuth2 Client Secret for the above. |
| `GMAIL_REFRESH_TOKEN` | Refresh token generated once via [OAuth Playground](https://developers.google.com/oauthplayground) for the Gmail API scope. |
| `GMAIL_REDIRECT_URI` | Defaults to the OAuth Playground URI if unset — only change this if you generated the refresh token elsewhere. |

If any of `GMAIL_USER` / `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` /
`GMAIL_REFRESH_TOKEN` are missing, the server still starts — it just logs a
warning and skips sending emails.

### Bot protection (optional but recommended for production)

| Variable | Description |
|---|---|
| `RECAPTCHA_SECRET_KEY` | Server-side secret for Google reCAPTCHA. If unset, the server logs a startup warning and sign-in proceeds **without** bot protection. Pair with `VITE_RECAPTCHA_SITE_KEY` on the frontend. |

### Currently unused

| Variable | Description |
|---|---|
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Cloudflare R2 client config exists in `config/r2.js` but nothing currently calls it — file storage runs entirely on Google Drive. Safe to leave blank unless you're wiring up an R2-backed feature yourself. |

## 4. Google Cloud setup (step by step)

1. [Google Cloud Console](https://console.cloud.google.com/) → create/select a project
2. **APIs & Services → Library** → enable "Google Drive API"
3. **APIs & Services → OAuth consent screen** → add scope
   `https://www.googleapis.com/auth/drive.file`
4. **APIs & Services → Credentials** → **Create Credentials → OAuth Client ID** → Web application
   - Authorized JavaScript origins: your frontend URL(s)
   - Authorized redirect URIs: not required for the popup/code flow this app uses
5. Copy the Client ID and Client Secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   here, and the Client ID into the frontend's `VITE_GOOGLE_CLIENT_ID`

## 5. Run

```bash
npm start
```

The server connects to MongoDB, ensures TTL indexes exist, and starts
listening on `PORT`. Watch the console — it logs warnings for any optional
integration (email, reCAPTCHA) that isn't configured.

## Troubleshooting

- **"DRIVE_TOKEN_ENCRYPTION_KEY is not set"** — generate one (command above)
  and add it to `.env`. Every login that stores a Drive refresh token needs it.
- **CORS errors from the frontend** — `FRONTEND_URL` must be the exact
  origin the browser is on (scheme + host + port), no trailing slash.
- **"Google Drive not connected for this user"** — the user's refresh token
  is missing; they need to sign in again and grant Drive access.
- **Emails not sending** — check the startup logs for which `GMAIL_*`
  variable is missing; the refresh token expires/gets revoked if unused for
  long periods and needs to be regenerated via OAuth Playground.
