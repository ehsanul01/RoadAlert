# RoadAlert

Officer incident reporting + driver safety alerts.
React 19 + TypeScript + Vite frontend, FastAPI + SQLite backend.

## Run it (two terminals)

Requires Node 20.19+ / 22.12+ and Python 3.10+.

**Terminal 1 – backend** (port 8000)

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

**Terminal 2 – frontend** (port 5173, proxies `/api` to 8000)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Demo accounts (seeded on first start)

| Role    | Email               | Password    |
|---------|---------------------|-------------|
| Officer | officer@agency.gov  | officer123  |
| Driver  | driver@example.com  | driver123   |

Or click **Preview police/driver dashboard** for a no-backend demo with fictional data.

### Single-process mode

```bash
cd frontend && npm run build
cd ../backend && uvicorn app:app --port 8000
```

FastAPI then serves the built UI at http://localhost:8000.

## Features

- Officer: report incidents (type, severity, road, direction, location, lanes blocked, description), mark cleared, view cleared history
- Driver: live feed of active alerts, sorted by severity, auto-refresh every 15 s, filter by road/location
- Session restore on page reload; sign out revokes the server session
- Responsive layout, labelled form fields, keyboard focus styles

## API

| Method | Path | Who |
|--------|------|-----|
| POST | `/api/v1/auth/login` | anyone |
| POST | `/api/v1/auth/logout` | signed in |
| GET  | `/api/v1/auth/me` | signed in |
| GET  | `/api/v1/incidents[?include_cleared=true]` | signed in (cleared history: officers only) |
| POST | `/api/v1/incidents` | officer |
| POST | `/api/v1/incidents/{id}/clear` | officer |
| GET  | `/api/v1/health` | anyone |

Interactive docs: http://localhost:8000/docs

## Security built in

- Roles are decided and enforced by the server; the login tab is cosmetic
- PBKDF2-SHA256 password hashing
- Session in `HttpOnly`, `SameSite=Strict` cookie (8 h expiry); set `ROADALERT_SECURE_COOKIES=1` behind HTTPS
- CSRF: double-submit token (`ra_csrf` cookie → `X-CSRF-Token` header) required on every state change
- Login rate limit (10 attempts / 5 min per IP)
- Audit log table for logins, failed logins, incident create/clear
- Drivers only see active incidents < 12 h old

## Before real deployment

Not included: MFA / agency SSO for officers, user registration and admin tools, Postgres, HTTPS hosting, push/SMS notifications, maps/geolocation, highway sign integration.

**Do not use this to alert real motorists or control government highway signs without agency authorization.**

Config: `ROADALERT_DB` (SQLite path), `ROADALERT_SECURE_COOKIES`.
