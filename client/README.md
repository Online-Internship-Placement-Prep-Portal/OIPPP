# OIPPP client

React 18 single-page client for the OIPPP API: Vite, React Router 7, axios and Recharts.

## Setup

Requires Node.js 20+ and the API running on `http://localhost:5000` (see the [root README](../README.md#getting-started)).

```bash
cd client
npm ci
npm run dev        # http://localhost:5173, /api is proxied to http://localhost:5000
```

## Scripts

| Script | What it does |
|:--|:--|
| `npm run dev` | Dev server on port 5173 with the `/api` proxy |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run lint` | ESLint over `src` |
| `npm test` | Vitest and React Testing Library, once |

## Configuration

| Variable | Default | Purpose |
|:--|:--|:--|
| `VITE_API_URL` | `/api` | API base URL baked into a production build, e.g. `https://oippp-api.onrender.com/api`. Leave unset when the client is served from the same origin as the API |

## Structure

```
src/
  api/client.js        axios instance: bearer token, 401 sign-out, error mapping
  auth/                session context and role guard
  components/          layout, notification bell, listing card, PDF viewer, shared UI
  lib/                 formatting, validation, status transitions, timer and auto-save
  pages/               Login, Register, Help, plus student/, recruiter/ and admin/ screens
  test/                Vitest suites
```

## Screens by role

- **Student:** home feed (top 10 matches, deadlines this week), internship search with filters, listing detail and apply, saved internships, my applications with history, profile and resume, aptitude tests with a server-synced timer and auto-save, results, progress.
- **Recruiter:** my listings, post or edit a listing, applicants per listing with resume viewer and status actions.
- **Admin:** users (approve or reject recruiters, deactivate, view resumes), question bank, test builder, placement statistics with CSV export, one-offer policy setting.
