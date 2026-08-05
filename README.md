# Airstream — Web Frontend (`main` branch)

[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Socket.IO Client](https://img.shields.io/badge/Socket.IO_Client-4.7-010101?style=flat&logo=socketdotio)](https://socket.io/)
[![IndexedDB](https://img.shields.io/badge/Storage-IndexedDB-orange?style=flat)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Airstream Frontend** is the user-facing Single Page Application (SPA) for the Airstream personal cloud storage system. Built with React 18, Vite 6, and Tailwind CSS, it provides a fast file manager experience with instant boot local caching, real-time WebSocket updates, custom media players, and Google Drive integration.

> 📌 **Branch Note**: This is the **`main`** branch containing the React web client. For the Express + MongoDB + Google Drive API backend server, refer to the **[`main2`](https://github.com/imanki-t/Air/tree/main2)** branch.

---

## Table of Contents

- [Architectural Overview](#architectural-overview)
- [Key Features & Capabilities](#key-features--capabilities)
- [UI Components & Media Player](#ui-components--media-player)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start & Setup](#quick-start--setup)
- [Environment Variables](#environment-variables)
- [Npm Scripts](#npm-scripts)
- [Branch & Integration Workflow](#branch--integration-workflow)

---

## Architectural Overview

```
 ┌─────────────────────────────────────────────────────────┐
 │                   User Browser / SPA                    │
 │               (React 18 / Vite Client)                  │
 └──────┬──────────────────────┬──────────────────────┬────┘
        │                      │                      │
 ┌──────▼────────┐      ┌──────▼────────┐      ┌──────▼────────┐
 │ IndexedDB     │      │ Socket.IO     │      │ Express API   │
 │ Local Cache   │      │ Live Sync     │      │ (main2)       │
 └───────────────┘      └───────────────┘      └───────────────┘
```

1. **Instant Cold Boot**: The app loads the initial file tree directly from an IndexedDB local cache (`src/fileStore.js`) while asynchronously requesting delta updates (`?since=<timestamp>`) from the backend API.
2. **Real-time Event Synchronization**: Socket.IO events (`file:created`, `file:deleted`, `file:updated`, `icon:updated`, `folder:updated`) instantly update UI states across open browser tabs and devices.
3. **Custom Media Suite**: Includes an embedded liquid glass video and audio player with custom controls, auto-play safeguards, and responsive mobile/desktop positioning.

---

## Key Features & Capabilities

- **Google OAuth 2.0 Sign-In (`SignUp.jsx`)**: Integrated Google Identity Services flow supporting seamless session authorization.
- **File & Folder Management (`FileList.jsx`, `FolderList.jsx`)**: Nested folder creation, drag-and-drop file uploads, custom icon assignments, and multi-view file filtering.
- **Custom Thumbnail Upload Stability**: Resilient preview rendering with null-safe property access that eliminates `ReferenceError` dashboard crashes on custom image/thumbnail uploads.
- **Real-Time Websocket Updates**: Automatic UI state synchronization using `socket.io-client` for multi-tab and multi-device consistency.
- **Offline-Friendly Delta Sync (`src/fileStore.js`)**: Caches metadata locally in IndexedDB and retrieves only changed records via delta sync endpoints on reconnection.
- **Integrated User Suite**:
  - **User Notes Dashboard (`UserNotesDashboard.jsx`)**: Quick personal note-taking embedded inside the file manager.
  - **Profile Menu (`ProfileMenu.jsx`)**: Account management, preference configuration, backup export triggers, and account deletion grace period notices.
- **Production Web Optimization**: Pre-configured SEO meta tags, `sitemap.xml`, `robots.txt`, web app manifest (`site.webmanifest`), and responsive favicons.

---

## UI Components & Media Player

### Liquid Glass Media Controller (`FileItem.jsx`)
The embedded video player features a custom floating control bar engineered with Tailwind CSS glassmorphic effects:
- **Responsive Layout Constraints**: Enforces symmetrical `left-3 right-3 sm:w-auto` bounding box constraints to eliminate right-edge overflow on mobile screens while maintaining a polished floating look on desktop viewports.
- **Browser Playback Compliance**: Handles promise rejection on interrupted video play calls (`play().catch()`) to prevent Chrome console abort warnings during rapid media selection.
- **Autofill Compliance**: Explicit `id` and `name` attributes across login and user input fields for standard browser autofill compliance.

---

## Tech Stack

| Library / Tool | Version | Description |
|---|---|---|
| **React** | `^18.2.0` | Frontend UI library |
| **Vite** | `^6.4.3` | Next-generation frontend build tooling |
| **Tailwind CSS** | `^3.4.1` | Utility-first styling framework |
| **React Router** | `^7.18.2` | Declarative single page routing |
| **Socket.IO Client** | `^4.7.5` | Real-time WebSocket connection client |
| **Axios** | `^1.6.0` | Promise-based HTTP client |
| **QRCode.react** | `4.2.0` | QR code generation for quick file link sharing |
| **JSZip & FileSaver** | `^3.10.1` / `^2.0.5` | Client-side archive compression & file saving |
| **PostCSS & Autoprefixer**| `^8.4.31` / `^10.4.17` | CSS processing & auto-vendor prefixing |

---

## Project Structure

```
Air/
├── public/                     # Static web assets
│   ├── access-granted.mp3      # Auth audio indicator
│   ├── air.png / airstream.png # Application logos & branding
│   ├── favicon* / apple-*      # Cross-platform icons & app manifest
│   ├── robots.txt              # Search engine crawler instructions
│   └── sitemap.xml             # Web page index file
├── src/
│   ├── components/             # UI Components
│   │   ├── FileItem.jsx        # Individual file card & liquid glass video/audio player
│   │   ├── FileList.jsx        # File grid/list display, filter & search bar
│   │   ├── FolderList.jsx      # Directory tree & folder navigation UI
│   │   ├── Homepage.jsx        # Landing page & feature introduction
│   │   ├── ProfileMenu.jsx     # Profile settings, data export & account options
│   │   ├── SignUp.jsx          # Google OAuth sign-in modal & identity trigger
│   │   ├── UploadForm.jsx      # File upload drop zone & progress monitor
│   │   └── UserNotesDashboard.jsx # Quick notes overlay widget
│   ├── App.jsx                 # Main application container, router & Socket.IO listener
│   ├── fileStore.js            # IndexedDB cache helper for instant boot & delta sync
│   ├── index.css               # Global CSS & Tailwind directives
│   └── main.jsx                # React application DOM entry point
├── .env.example                # Frontend environment configuration template
├── index.html                  # Main HTML document template
├── package.json                # Project dependencies & build scripts
├── postcss.config.js           # PostCSS configuration for Tailwind
├── tailwind.config.js          # Tailwind CSS theme & plugin setup
├── vite.config.js              # Vite build & dev server configuration
└── README.md                   # Frontend documentation (this file)
```

---

## Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Running Backend Server**: An instance of the Airstream backend running on `main2` (default: `http://localhost:5000`)

---

## Quick Start & Setup

1. **Clone & Checkout Frontend Branch**:
   ```bash
   git clone https://github.com/imanki-t/Air.git
   cd Air
   git checkout main
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and configure your API endpoint & Google Client ID:
   ```bash
   cp .env.example .env
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## Environment Variables

Create a `.env` file in the project root based on `.env.example`:

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_BACKEND_URL` | **Yes** | `http://localhost:5000` | Base URL of the Airstream API server (no trailing slash) |
| `VITE_GOOGLE_CLIENT_ID` | **Yes** | — | Google OAuth 2.0 Web Client ID (must match backend `GOOGLE_CLIENT_ID`) |
| `VITE_RECAPTCHA_SITE_KEY` | Optional | — | Google reCAPTCHA site key (if enabled on backend) |

---

## Npm Scripts

| Script | Command | Purpose |
|---|---|---|
| **`npm run dev`** | `vite` | Launches the Vite dev server with hot module replacement (HMR) |
| **`npm run build`** | `vite build` | Compiles and optimizes production assets into the `dist/` directory |
| **`npm run preview`** | `vite preview` | Serves the locally built `dist/` production folder for testing |

---

## Branch & Integration Workflow

- **Frontend (`main`)**: Focuses on UI components, state management, media player controls, and client-side caching.
- **Backend (`main2`)**: Focuses on Node.js/Express REST endpoints, MongoDB metadata, and Google Drive storage integration.

To update and push changes on `main`:
```bash
# Verify build clean pass
npm run build

# Commit and push updates to main branch
git add .
git commit -m "docs: update comprehensive frontend README.md for main branch"
git push origin main
```

---

## License

This project is licensed under the [MIT License](LICENSE).
