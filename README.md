# Airstream — Backend API (`main2` branch)

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat&logo=nodedotjs)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%207-47A248?style=flat&logo=mongodb)](https://www.mongodb.com/)
[![Google Drive API](https://img.shields.io/badge/Google%20Drive-API%20v3-4285F4?style=flat&logo=googledrive)](https://developers.google.com/drive)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?style=flat&logo=socketdotio)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Airstream Backend** is the RESTful API and real-time Socket.IO server powering the Airstream personal cloud storage system. Built with Node.js, Express, and MongoDB, it streams file bytes directly to and from each user's private Google Drive application folder (`appDataFolder`). The application database stores file metadata, pointers, and user settings—never raw file binaries.

> 📌 **Branch Note**: This is the **`main2`** branch containing the backend API. For the React + Vite web frontend client, refer to the **[`main`](https://github.com/imanki-t/Air/tree/main)** branch.

---

## Table of Contents

- [Architectural Overview](#architectural-overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Layout](#project-layout)
- [Prerequisites](#prerequisites)
- [Quick Start & Setup](#quick-start--setup)
- [Environment Variables](#environment-variables)
- [API Endpoints Overview](#api-endpoints-overview)
- [Security & Data Integrity](#security--data-integrity)
- [Branch & Deployment Workflow](#branch--deployment-workflow)

---

## Architectural Overview

```
 ┌─────────────────────────────────────────────────────────┐
 │                  Airstream Frontend                     │
 │               (React 18 / Vite / main)                  │
 └─────────────┬─────────────────────────────▲─────────────┘
               │ HTTP REST Requests          │ Real-time Events
               │ (JWT Session Cookie)        │ (Socket.IO)
 ┌─────────────▼─────────────────────────────┴─────────────┐
 │                  Airstream Backend                      │
 │              (Node.js / Express / main2)                │
 └──────┬──────────────────────┬──────────────────────┬────┘
        │ Metadata & Auth      │ Stream Files         │ Encryption
 ┌──────▼────────┐      ┌──────▼────────┐      ┌──────▼────────┐
 │   MongoDB     │      │ Google Drive  │      │ AES-256-GCM   │
 │ Database      │      │ appDataFolder │      │ Token Crypto  │
 └───────────────┘      └───────────────┘      └───────────────┘
```

1. **Zero Server Storage**: User files are uploaded directly to a hidden `appDataFolder` in the user's personal Google Drive. The backend acts as a streaming pipeline.
2. **Encrypted Credentials**: Google OAuth refresh tokens are encrypted at rest using AES-256-GCM authenticated encryption before being saved to MongoDB.
3. **Real-Time Synchronization**: Changes in files, custom icons, or folders trigger Socket.IO events broadcasted to all active client sessions.
4. **Resilient Lifecycle Cleanup**: Deleting a file or folder in Airstream automatically purges associated custom icons and assets directly from Google Drive storage.

---

## Key Features

- **Google Drive Storage Integration (`driveService.js`)**: Secure file streaming using the restricted `drive.appdata` scope.
- **JWT & Session Security**: Short-lived JWT access tokens paired with rotating HTTP-only refresh cookies.
- **AES-256-GCM Token Encryption (`tokenCrypto.js`)**: High-grade cryptographic protection for stored Google refresh tokens.
- **Real-Time Updates via Socket.IO**: Instant web-socket synchronization across devices for file uploads, updates, custom icons, and folder modifications.
- **Delta Sync Support (`GET /api/files?since=<timestamp>`)**: Enables lightweight client cache updates by retrieving only changed records since the last sync.
- **HTTP 206 Partial Content Streaming**: Native byte-range video and audio seeking with optimized memory usage.
- **Custom Thumbnail & Icon Lifecycle**: Upload custom thumbnails for files with automated orphaned asset cleanup upon file deletion.
- **Encrypted Data Backup & Export**: Generate password-protected ZIP archives sent via transactional Gmail API links.
- **7-Day Account Recovery Grace Period**: Soft account deletion with delayed permanent purge background jobs.
- **Bot Protection & Security Hardening**: Helmet HTTP security headers (with custom `crossOriginOpenerPolicy` for OAuth popups) and rate-limiting middleware (`express-rate-limit`).

---

## Tech Stack

| Component | Technology | Description |
|---|---|---|
| **Runtime** | Node.js (v18+) | Server execution environment |
| **Framework** | Express 4.18 | RESTful web framework |
| **Database** | MongoDB & Mongoose 7 | Document storage for metadata & indexes |
| **Cloud Storage** | Google Drive API (`googleapis` v149) | User storage engine via `appDataFolder` |
| **Auth & Security** | Google OAuth2, JWT, Helmet 7 | OAuth sign-in, session tokens, HTTP security |
| **Crypto** | Node Native Crypto (AES-256-GCM) | Token encryption at rest |
| **Real-time** | Socket.IO 4.7 | Event-driven WebSocket engine |
| **Email** | Gmail API | Transactional emails & export notifications |
| **Archiving** | Archiver 7 & Adm-Zip | Backup zip archive generation |

---

## Project Layout

```
Air/
├── config/
│   ├── db.js                   # MongoDB connection logic & TTL index setup
│   └── r2.js                   # Staged Cloudflare R2 client (future storage backend)
├── controllers/
│   └── fileController.js       # Core handlers for file upload, download, thumbnail & stream
├── middleware/
│   ├── authMiddleware.js       # JWT authentication & session validation
│   └── rateLimitMiddleware.js  # Express rate limiting rules
├── routes/
│   ├── authRoutes.js           # Google Auth, session status, export/import, account deletion
│   ├── fileRoutes.js           # File metadata, upload, download, custom icons & delta sync
│   └── folderRoutes.js         # Folder CRUD and hierarchy management
├── services/
│   ├── driveService.js         # Google Drive API operations (appDataFolder, stream, delete)
│   ├── fileService.js          # File metadata business logic
│   ├── folderService.js        # Folder hierarchy business logic
│   └── emailService.js         # Gmail API email delivery engine
├── utils/
│   ├── driveUtils.js           # Helper utilities for Google Drive response parsing
│   ├── fileType.js             # MIME type detection & extension mapping
│   └── tokenCrypto.js          # AES-256-GCM encrypt/decrypt for Drive tokens
├── .env.example                # Template for environment configuration
├── package.json                # Server dependencies & scripts
├── server.js                   # Application entry point, Socket.IO setup, cleanup tasks
├── README.md                   # Backend documentation (this file)
└── SETUP.md                    # Detailed setup and deployment guide
```

---

## Prerequisites

- **Node.js**: `v18.0.0` or higher
- **MongoDB**: Local instance or MongoDB Atlas cluster
- **Google Cloud Platform Project**:
  - Google OAuth 2.0 Web Application Credentials
  - Enabled **Google Drive API** (with `https://www.googleapis.com/auth/drive.appdata` scope)
  - (Optional) Enabled **Gmail API** for transactional email support

---

## Quick Start & Setup

1. **Clone & Checkout Backend Branch**:
   ```bash
   git clone https://github.com/imanki-t/Air.git
   cd Air
   git checkout main2
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and populate the values:
   ```bash
   cp .env.example .env
   ```

4. **Start the Development Server**:
   ```bash
   npm start
   ```
   The backend server will launch at `http://localhost:5000` (or your configured `PORT`).

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | HTTP port server listens on |
| `NODE_ENV` | No | `development` | Environment mode (`development` / `production`) |
| `MONGO_URI` | **Yes** | — | MongoDB connection string |
| `JWT_SECRET` | **Yes** | — | Secret key used to sign session JWTs |
| `FRONTEND_URL` | **Yes** | `http://localhost:5173` | Allowed frontend origin for CORS & Socket.IO |
| `BACKEND_URL` | **Yes** | `http://localhost:5000` | Public URL of backend (for email links) |
| `GOOGLE_CLIENT_ID` | **Yes** | — | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | **Yes** | — | Google OAuth 2.0 Client Secret |
| `DRIVE_TOKEN_ENCRYPTION_KEY` | **Yes** | — | 32-byte base64 string for AES-256-GCM token encryption |
| `GMAIL_USER` | Optional | — | Gmail sender account email |
| `GMAIL_CLIENT_ID` | Optional | — | Gmail OAuth Client ID |
| `GMAIL_CLIENT_SECRET` | Optional | — | Gmail OAuth Client Secret |
| `GMAIL_REFRESH_TOKEN` | Optional | — | Gmail OAuth Refresh Token |
| `RECAPTCHA_SECRET_KEY` | Optional | — | Google reCAPTCHA secret key for auth verification |

*Tip: Generate encryption keys using Node.js:*
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## API Endpoints Overview

### Authentication (`/api/auth`)
- `POST /api/auth/google` — Sign in / register via Google ID token.
- `GET /api/auth/session` — Verify current user session & JWT.
- `POST /api/auth/logout` — Revoke session and clear HTTP cookies.
- `POST /api/auth/export` — Trigger data export (encrypted ZIP via email).
- `DELETE /api/auth/account` — Initiate 7-day soft account deletion.

### Files (`/api/files`)
- `GET /api/files` — Retrieve user file list (supports `?since=` for delta sync).
- `POST /api/files/upload` — Upload new file to Google Drive `appDataFolder`.
- `GET /api/files/:id/stream` — Stream file content (supports HTTP 206 range requests).
- `POST /api/files/:id/thumbnail` — Upload custom thumbnail/icon for a file.
- `DELETE /api/files/:id` — Delete file from database and purge from Google Drive.

### Folders (`/api/folders`)
- `GET /api/folders` — Fetch user folder hierarchy.
- `POST /api/folders` — Create a new folder.
- `PUT /api/folders/:id` — Rename or move folder.
- `DELETE /api/folders/:id` — Delete folder and update nested children.

---

## Security & Data Integrity

- **Helmet COOP Compliance**: Configured with `crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }` to prevent OAuth popups from breaking during authentication.
- **Drive Icon Lifecycle Purge**: Associated custom icon images stored in Google Drive are automatically deleted when the target file is removed, preventing storage leaks.
- **Rate Limiting**: Critical endpoints (login, account deletion, file upload) are protected by rate limiters to prevent brute-force attacks.

---

## Branch & Deployment Workflow

- **Backend Branch (`main2`)**: Maintained for API server code, MongoDB schemas, and Google Drive services.
- **Frontend Branch (`main`)**: Maintained for the React + Vite single page application.

To sync updates across branches:
```bash
# Push updates to main2 branch
git add .
git commit -m "docs: update main2 backend README"
git push origin main2
```

---

## License

This project is licensed under the [MIT License](LICENSE).
