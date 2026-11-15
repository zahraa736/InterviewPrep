# InterviewPrep client

This folder contains the React/Vite frontend for InterviewPrep. It provides authentication screens, the dashboard, practice questions, timed mock interviews, progress tracking, profile information, responsive navigation, and light/dark themes.

## Setup

Install dependencies:

```bash
npm install
```

Create `client/.env` and point it to the running InterviewPrep API:

```env
VITE_API_URL=http://localhost:5000
```

Start the development server:

```bash
npm run dev
```

The server must allow the Vite origin through `CLIENT_ORIGIN`. The default Vite origin is `http://localhost:5173`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create the production bundle |
| `npm run preview` | Preview the production bundle locally |
| `npm run lint` | Run Oxlint |
| `npm test` | Run Vitest component tests |

## API integration

All pages use `src/api/client.js`. Its `apiFetch()` helper reads `VITE_API_URL`, includes the stored JWT when available, converts unsuccessful HTTP responses into errors, and dispatches `auth:expired` after an HTTP 401 response.

Frontend tests mock `apiFetch()`, so they do not contact the real backend or database. See the [root README](../README.md) for complete setup, API, security, and testing documentation.
