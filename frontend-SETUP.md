# Frontend Setup

## 1. Prerequisites

- Node.js 18 or later
- The Airstream backend running somewhere reachable (locally on `http://localhost:5000`,
  or deployed) — see the backend's own `SETUP.md`
- A Google Cloud OAuth 2.0 Client ID (the **same** one configured on the backend)

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable                  | Required | Description |
|----------------------------|:--------:|-------------|
| `VITE_BACKEND_URL`         | ✅ | Base URL of the backend API, e.g. `http://localhost:5000` in dev, or your deployed backend URL in production. No trailing slash. |
| `VITE_GOOGLE_CLIENT_ID`    | ✅ | Google OAuth 2.0 Client ID used for Sign in with Google. Must match `GOOGLE_CLIENT_ID` on the backend. |
| `VITE_RECAPTCHA_SITE_KEY`  | Optional | Google reCAPTCHA v2/v3 site key, if the backend has `RECAPTCHA_SECRET_KEY` set. Leave blank in dev if you haven't set up reCAPTCHA. |

> Vite only exposes variables prefixed `VITE_` to the browser — don't add
> secrets here, this bundle ships to the client.

### Getting a Google OAuth Client ID

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application type)
3. Add your frontend origin(s) to **Authorized JavaScript origins**
   (e.g. `http://localhost:5173`, and your production domain)
4. Use the same Client ID here and as `GOOGLE_CLIENT_ID` on the backend

## 4. Run the dev server

```bash
npm run dev
```

Vite will print a local URL (default `http://localhost:5173`). Make sure
`FRONTEND_URL` on the backend matches this origin (for CORS + cookies).

## 5. Production build

```bash
npm run build
```

Outputs static files to `dist/`. Serve `dist/` from any static host
(Netlify, Vercel, Cloudflare Pages, nginx, or the backend itself can serve
it — see `Air-main2/dist/` in the backend repo).

## Troubleshooting

- **CORS / cookie errors on sign-in** — the backend's `FRONTEND_URL` env var
  must exactly match the origin you're loading the frontend from (protocol +
  host + port).
- **"Google Drive not connected" errors** — make sure `VITE_GOOGLE_CLIENT_ID`
  and the backend's `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are for the
  same OAuth client, and that the OAuth consent screen has the Drive scope
  enabled.
- **Blank file list after login** — check the browser console/network tab
  for failed requests to `VITE_BACKEND_URL`; confirm the backend is running
  and reachable from the browser (not just from your machine, if deployed).
