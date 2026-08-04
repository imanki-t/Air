# Airstream — Backend

Express + MongoDB API for Airstream. Handles auth, file/folder metadata,
and streams file bytes to/from each user's own Google Drive (files are
stored in an "Airstream" folder created in the user's Drive — the app
database never holds file contents, only metadata and pointers).

## Stack

- Node.js + Express
- MongoDB (via Mongoose + native driver)
- Google Drive API (`googleapis`) — file storage
- Google OAuth2 (`google-auth-library`) — sign-in
- Socket.IO — live updates pushed to connected clients
- JWT (access token) + rotating refresh tokens (httpOnly cookies)
- Gmail API — transactional email (welcome email, export links)
- Helmet, express-rate-limit — security headers & rate limiting

## Features

- Google Sign-In, session via short-lived JWT + rotating refresh token
- Per-user Google Drive storage — uploads go straight to the user's own Drive
- Drive refresh tokens encrypted at rest (AES-256-GCM) before being stored in MongoDB
- Folder organization, custom file/folder icons
- Delta sync endpoint (`?since=`) so clients only pull what changed
- Byte-range streaming (HTTP 206) for video/audio seeking
- Data export (ZIP via email link) and import
- Account deletion with a 7-day recovery window before permanent purge
- reCAPTCHA-gated auth endpoint, rate-limited sensitive routes

## Project layout

```
server.js                     app entry point, Socket.IO, cleanup jobs
config/
  db.js                        MongoDB connection + TTL indexes
  r2.js                        Cloudflare R2 client (currently unused —
                                storage runs on Google Drive; kept for a
                                possible future storage backend)
controllers/
  fileController.js
middleware/
  authMiddleware.js             JWT verification, route protection
  rateLimitMiddleware.js
routes/
  authRoutes.js                 sign-in, session, export/import, account deletion
  fileRoutes.js
  folderRoutes.js
services/
  driveService.js               all Google Drive API operations
  fileService.js
  folderService.js
  emailService.js               Gmail API transactional email
utils/
  driveUtils.js
  fileType.js
  tokenCrypto.js                 AES-256-GCM encrypt/decrypt for Drive refresh tokens
```

## Requirements

- Node.js 18+
- A MongoDB database (Atlas or self-hosted)
- A Google Cloud OAuth 2.0 Client (Web application type) with the Drive API enabled
- (Optional) A Gmail account configured for API-based sending, for emails
- (Optional) reCAPTCHA secret key, to enforce bot protection on sign-in

## Quick start

See [SETUP.md](./SETUP.md) for the full walkthrough. Short version:

```bash
npm install
cp .env.example .env      # then fill in the values
npm start
```

Server listens on `PORT` (default `5000`).

## Related

- Frontend repo: Airstream frontend
