# Airstream — Web Frontend (`main` branch)

[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Socket.IO Client](https://img.shields.io/badge/Socket.IO_Client-4.7-010101?style=flat&logo=socketdotio)](https://socket.io/)
[![IndexedDB](https://img.shields.io/badge/Storage-IndexedDB-orange?style=flat)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Airstream Frontend** is the user-facing Single Page Application (SPA) for the Airstream personal cloud storage system. Built with React 18, Vite 6, and Tailwind CSS, it delivers a fast file management interface equipped with instant boot local caching, real-time WebSocket updates, custom media players, and Google Drive storage integration.

> 📌 **Branch Note**: This is the **`main`** branch containing the React web client. For the Express + MongoDB + Google Drive API backend server, refer to the **[`main2`](https://github.com/imanki-t/Air/tree/main2)** branch.

---

## Table of Contents

- [Architectural Overview](#architectural-overview)
- [Key Features & Capabilities](#key-features--capabilities)
- [UI Components Architecture](#ui-components-architecture)
- [Core Application Modules](#core-application-modules)
- [Tech Stack](#tech-stack)
- [Project Directory Structure](#project-directory-structure)
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

1. **Instant Cold Boot**: Loads the file list tree from an IndexedDB local cache (`src/fileStore.js`) while fetching delta updates (`?since=<timestamp>`) from the backend API.
2. **Real-time Event Synchronization**: Socket.IO events (`file:created`, `file:deleted`, `file:updated`, `icon:updated`, `folder:updated`) automatically synchronize UI state across open browser tabs and devices.
3. **Responsive Glassmorphism UI**: Styled with Tailwind CSS for glassmorphic elements, adaptive grid/list layouts, and responsive media players across desktop and mobile viewports.

---

## Key Features & Capabilities

- **Google OAuth 2.0 Sign-In**: Integrated Google Identity Services flow supporting seamless session authorization.
- **File & Folder Management**: Deep folder hierarchies, drag-and-drop file uploads, custom icon assignments, and real-time search filtering.
- **Custom Thumbnail Upload Stability**: Resilient preview rendering with null-safe property access that prevents `ReferenceError` dashboard white screen crashes on custom thumbnail uploads.
- **Real-Time Websocket Updates**: Automatic UI synchronization using `socket.io-client` for multi-tab and multi-device consistency.
- **Offline-Friendly Delta Sync**: Caches metadata locally in IndexedDB and fetches only modified records on reconnection.
- **Production Web Optimization**: Pre-configured SEO meta tags, `sitemap.xml`, `robots.txt`, web app manifest (`site.webmanifest`), and responsive favicons.

---

## UI Components Architecture

The application UI is modularized inside `src/components/`, where each file serves a dedicated role in the user workflow:

| Component File | Role & Features |
|---|---|
| **`Homepage.jsx`** | Product landing page featuring Hero section, feature highlights, call-to-action triggers, and responsive layout branding. |
| **`SignUp.jsx`** | Google OAuth 2.0 sign-in modal and identity verification handler. Manages authentication state, user session handshakes, and input compliance. |
| **`FileList.jsx`** | Primary dashboard file workspace supporting grid/list view toggles, real-time query searching, multi-column sorting (name, date, size), and selection handling. |
| **`FolderList.jsx`** | Directory tree navigation bar and folder organizer managing parent/child folder browsing and folder creation. |
| **`FileItem.jsx`** | File representation card featuring embedded liquid glass video/audio playback with responsive `left-3 right-3 sm:w-auto` constraints, image zoom previewer, and file control menus. |
| **`UploadForm.jsx`** | Interactive upload modal with drag-and-drop file dropzone, real-time progress monitor, custom thumbnail image attachments, and payload validation. |
| **`ProfileMenu.jsx`** | User account settings slide-over managing storage quotas, data export/import workflows, and 7-day account deletion recovery notices. |
| **`UserNotesDashboard.jsx`** | Quick notes overlay widget allowing users to draft and persist personal scratchpad notes directly within the workspace. |

---

## Core Application Modules

Beyond UI components, core application logic is organized in the `src/` directory:

- **`src/App.jsx`**: Top-level application shell, client-side route manager, global state hub, and Socket.IO WebSocket event listener.
- **`src/main.jsx`**: React application entry point executing DOM mounting and root hydration.
- **`src/fileStore.js`**: IndexedDB storage manager handling local file metadata caching, instant cold boot, and delta sync timestamp queries (`?since=`).
- **`src/index.css`**: Global CSS design system, custom scrollbars, glassmorphism utilities, and Tailwind directives.

---

## Tech Stack

| Library / Tool | Version | Description |
|---|---|---|
| **React** | `^18.2.0` | Frontend UI library |
| **Vite** | `^6.4.3` | Build tool & hot module replacement (HMR) dev server |
| **Tailwind CSS** | `^3.4.1` | Utility-first styling framework |
| **React Router** | `^7.18.2` | Client-side routing engine |
| **Socket.IO Client** | `^4.7.5` | Real-time WebSocket connection client |
| **Axios** | `^1.6.0` | Promise-based HTTP client for API communications |
| **QRCode.react** | `4.2.0` | Client-side QR code generator for file sharing links |
| **JSZip & FileSaver** | `^3.10.1` / `^2.0.5` | Compression & client file download utilities |
| **PostCSS & Autoprefixer**| `^8.4.31` / `^10.4.17` | CSS processing & automated vendor prefixing |

---

## Project Directory Structure

```
Air/
├── public/                     # Static web assets
│   ├── access-granted.mp3      # Auth audio indicator
│   ├── air.png / airstream.png # Application logos & branding
│   ├── favicon* / apple-*      # Cross-platform icons & app manifest
│   ├── robots.txt              # Search engine crawler instructions
│   └── sitemap.xml             # Web page index file
├── src/
│   ├── components/             # Modular React UI components
│   │   ├── FileItem.jsx        # File card, liquid glass media player & image viewer
│   │   ├── FileList.jsx        # File grid/list display, filter & search bar
│   │   ├── FolderList.jsx      # Directory tree & folder navigation UI
│   │   ├── Homepage.jsx        # Landing page & feature introduction
│   │   ├── ProfileMenu.jsx     # Profile settings, data export & account options
│   │   ├── SignUp.jsx          # Google OAuth sign-in modal & identity trigger
│   │   ├── UploadForm.jsx      # File upload drop zone & progress monitor
│   │   └── UserNotesDashboard.jsx # Quick notes overlay widget
│   ├── App.jsx                 # Top-level state container & Socket.IO listener
│   ├── fileStore.js            # IndexedDB cache helper for instant boot & delta sync
│   ├── index.css               # Global CSS & Tailwind directives
│   └── main.jsx                # React application DOM entry point
├── .env.example                # Environment variables template
├── index.html                  # Main HTML document template
├── package.json                # Project dependencies & build scripts
├── postcss.config.js           # PostCSS setup
├── tailwind.config.js          # Tailwind CSS configuration
├── vite.config.js              # Vite configuration
└── README.md                   # Frontend documentation (this file)
```

---

## Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Running Backend Server**: An instance of the Airstream backend running on branch `main2` (default: `http://localhost:5000`)

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
   Copy `.env.example` to `.env` and set your backend API URL and Google Client ID:
   ```bash
   cp .env.example .env
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Access the web application at `http://localhost:5173`.

---

## Environment Variables

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
| **`npm run build`** | `vite build` | Compiles and optimizes production assets into `dist/` |
| **`npm run preview`** | `vite preview` | Serves local production `dist/` build for testing |

---

## Branch & Integration Workflow

- **Frontend (`main`)**: React SPA for user interaction, media playback, and client-side caching.
- **Backend (`main2`)**: Node.js/Express API for metadata, socket events, and Google Drive storage.

To commit and push updates to `main`:
```bash
npm run build
git add .
git commit -m "docs: expand frontend README to detail all components and core modules"
git push origin main
```

---

## License

This project is licensed under the [MIT License](LICENSE).
