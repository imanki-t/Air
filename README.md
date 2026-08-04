# Airstream — Frontend

React + Vite frontend for Airstream, a personal cloud file manager backed by
Google Drive storage.

## Stack

- React 18 + Vite 6
- Tailwind CSS
- React Router
- Socket.IO client (live updates — new uploads, deletes, icon changes)
- IndexedDB (local cache of the file list, so the app boots instantly and
  refreshes only fetch what changed since the last sync)

## Features

- Google Sign-In auth (talks to the backend, which issues its own session cookie)
- Upload, preview, and organize files into folders
- Custom image and video viewers (pinch/zoom, custom video controls)
- Real-time sync across tabs/devices via Socket.IO
- Offline-friendly file list cache with delta sync on reconnect
- Data export/import, account deletion with a 7-day recovery window

## Project layout

```
src/
  App.jsx                    top-level state, auth, file/folder sync
  main.jsx                   entry point
  fileStore.js                IndexedDB helpers (file list cache)
  components/
    Homepage.jsx              landing page
    SignUp.jsx                Google sign-in flow
    FileList.jsx / FolderList.jsx   main browsing UI
    FileItem.jsx              file card, image/video viewers
    UploadForm.jsx            upload flow
    ProfileMenu.jsx           account menu, preferences, export/delete
    UserNotesDashboard.jsx    notes feature
```

## Requirements

- Node.js 18+
- A running instance of the Airstream backend (local or deployed)

## Quick start

See [SETUP.md](./SETUP.md) for the full walkthrough. Short version:

```bash
npm install
cp .env.example .env      # then fill in the values
npm run dev
```

## Scripts

| Command           | Purpose                          |
|--------------------|-----------------------------------|
| `npm run dev`       | Start the Vite dev server         |
| `npm run build`     | Production build → `dist/`        |
| `npm run preview`   | Preview the production build      |

## Related

- Backend repo / API: Airstream backend
