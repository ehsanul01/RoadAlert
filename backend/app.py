"""RoadAlert backend: FastAPI + SQLite.

Session auth with HttpOnly cookies, double-submit CSRF token, server-enforced
roles (officer / driver), and incident create / list / clear endpoints.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import sqlite3
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from pydantic import BaseModel, Field

DB_PATH = os.environ.get("ROADALERT_DB", os.path.join(os.path.dirname(__file__), "roadalert.db"))
SESSION_TTL = 8 * 60 * 60  # 8 hours
SECURE_COOKIES = os.environ.get("ROADALERT_SECURE_COOKIES", "0") == "1"  # set 1 behind HTTPS
INCIDENT_MAX_AGE = 12 * 60 * 60  # active incidents older than this are hidden from drivers

app = FastAPI(title="RoadAlert API", version="1.0.0")


# ---------- database ----------
@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    salt_hex, _ = stored.split("$", 1)
    return hmac.compare_digest(hash_password(password, bytes.fromhex(salt_hex)), stored)


SEED_USERS = [
    ("u-officer-1", "Officer Dana Reyes", "officer@agency.gov", "officer123", "officer", "Erie County Highway Patrol"),
    ("u-driver-1", "Sam Driver", "driver@example.com", "driver123", "driver", None),
]


def init_db() -> None:
    with db() as c:
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('officer','driver')),
              agency TEXT
            );
            CREATE TABLE IF NOT EXISTS sessions (
              token TEXT PRIMARY KEY, user_id TEXT NOT NULL, csrf TEXT NOT NULL, expires_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS incidents (
              id TEXT PRIMARY KEY, type TEXT NOT NULL, severity TEXT NOT NULL,
              road TEXT NOT NULL, direction TEXT NOT NULL, location TEXT NOT NULL,
              description TEXT NOT NULL, lanes_blocked INTEGER NOT NULL,
              status TEXT NOT NULL DEFAULT 'active', reported_by TEXT NOT NULL,
              agency TEXT, created_at TEXT NOT NULL, created_ts REAL NOT NULL,
              cleared_at TEXT, cleared_by TEXT
            );
            CREATE TABLE IF NOT EXISTS audit_log (
              id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL, user_id TEXT,
              action TEXT NOT NULL, detail TEXT
            );
            """
        )
        for uid, name, email, pw, role, agency in SEED_USERS:
            if not c.execute("SELECT 1 FROM users WHERE id=?", (uid,)).fetchone():
                c.execute(
                    "INSERT INTO users VALUES (?,?,?,?,?,?)",
                    (uid, name, email, hash_password(pw), role, agency),
                )


init_db()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def audit(c: sqlite3.Connection, user_id: str | None, action: str, detail: str = "") -> None:
    c.execute("INSERT INTO audit_log (ts,user_id,action,detail) VALUES (?,?,?,?)", (now_iso(), user_id, action, detail))


# ---------- simple login rate limit (per IP) ----------
_attempts: dict[str, list[float]] = {}


def rate_limit(ip: str, limit: int = 10, window: int = 300) -> None:
    t = time.time()
    hits = [h for h in _attempts.get(ip, []) if t - h < window]
    if len(hits) >= limit:
        raise HTTPException(429, "Too many login attempts. Try again in a few minutes.")
    hits.append(t)
    _attempts[ip] = hits


# ---------- auth dependencies ----------
def user_public(row: sqlite3.Row) -> dict:
    return {"id": row["id"], "name": row["name"], "email": row["email"], "role": row["role"], "agency": row["agency"]}


def current_session(request: Request) -> dict:
    token = request.cookies.get("ra_session")
    if not token:
        raise HTTPException(401, "Not signed in")
    with db() as c:
        row = c.execute(
            "SELECT s.csrf, s.expires_at, u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?",
            (token,),
        ).fetchone()
        if not row or row["expires_at"] < time.time():
            c.execute("DELETE FROM sessions WHERE token=?", (token,))
            raise HTTPException(401, "Session expired")
    # CSRF check for state-changing requests (double-submit header must match server value)
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        sent = request.headers.get("X-CSRF-Token", "")
        if not hmac.compare_digest(sent, row["csrf"]):
            raise HTTPException(403, "CSRF check failed")
    return {"token": token, "user": user_public(row)}


def require_officer(sess: dict = Depends(current_session)) -> dict:
    if sess["user"]["role"] != "officer":
        raise HTTPException(403, "Officer role required")
    return sess


# ---------- models ----------
class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=1, max_length=200)


IncidentType = Literal["crash", "debris", "stalled_vehicle", "road_work", "weather", "closure", "other"]
Severity = Literal["low", "moderate", "high", "critical"]
Direction = Literal["NB", "SB", "EB", "WB", "Both"]


class IncidentIn(BaseModel):
    type: IncidentType
    severity: Severity
    road: str = Field(min_length=1, max_length=80)
    direction: Direction
    location: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1, max_length=600)
    lanes_blocked: int = Field(ge=0, le=12)


def incident_out(r: sqlite3.Row) -> dict:
    return {
        "id": r["id"], "type": r["type"], "severity": r["severity"], "road": r["road"],
        "direction": r["direction"], "location": r["location"], "description": r["description"],
        "lanesBlocked": r["lanes_blocked"], "status": r["status"], "reportedBy": r["reported_by"],
        "agency": r["agency"], "createdAt": r["created_at"], "clearedAt": r["cleared_at"],
    }


# ---------- routes ----------
@app.get("/api/v1/health")
def health():
    return {"ok": True, "time": now_iso()}


@app.post("/api/v1/auth/login")
def login(body: LoginIn, request: Request, response: Response):
    rate_limit(request.client.host if request.client else "unknown")
    with db() as c:
        row = c.execute("SELECT * FROM users WHERE lower(email)=lower(?)", (body.email.strip(),)).fetchone()
        if not row or not verify_password(body.password, row["password_hash"]):
            audit(c, None, "login_failed", body.email)
            raise HTTPException(401, "Invalid email or password")
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(24)
        c.execute("DELETE FROM sessions WHERE expires_at < ?", (time.time(),))
        c.execute("INSERT INTO sessions VALUES (?,?,?,?)", (token, row["id"], csrf, time.time() + SESSION_TTL))
        audit(c, row["id"], "login")
    response.set_cookie("ra_session", token, max_age=SESSION_TTL, httponly=True, samesite="strict", secure=SECURE_COOKIES, path="/")
    response.set_cookie("ra_csrf", csrf, max_age=SESSION_TTL, httponly=False, samesite="strict", secure=SECURE_COOKIES, path="/")
    return {"user": user_public(row)}


@app.post("/api/v1/auth/logout")
def logout(response: Response, sess: dict = Depends(current_session)):
    with db() as c:
        c.execute("DELETE FROM sessions WHERE token=?", (sess["token"],))
        audit(c, sess["user"]["id"], "logout")
    response.delete_cookie("ra_session", path="/")
    response.delete_cookie("ra_csrf", path="/")
    return {"ok": True}


@app.get("/api/v1/auth/me")
def me(sess: dict = Depends(current_session)):
    return {"user": sess["user"]}


@app.get("/api/v1/incidents")
def list_incidents(include_cleared: bool = False, sess: dict = Depends(current_session)):
    with db() as c:
        if sess["user"]["role"] == "officer" and include_cleared:
            rows = c.execute("SELECT * FROM incidents ORDER BY created_ts DESC LIMIT 200").fetchall()
        else:
            rows = c.execute(
                "SELECT * FROM incidents WHERE status='active' AND created_ts > ? ORDER BY created_ts DESC",
                (time.time() - INCIDENT_MAX_AGE,),
            ).fetchall()
    return {"incidents": [incident_out(r) for r in rows]}


@app.post("/api/v1/incidents", status_code=201)
def create_incident(body: IncidentIn, sess: dict = Depends(require_officer)):
    u = sess["user"]
    iid = "inc-" + secrets.token_hex(5)
    with db() as c:
        c.execute(
            "INSERT INTO incidents (id,type,severity,road,direction,location,description,lanes_blocked,"
            "status,reported_by,agency,created_at,created_ts) VALUES (?,?,?,?,?,?,?,?,'active',?,?,?,?)",
            (iid, body.type, body.severity, body.road.strip(), body.direction, body.location.strip(),
             body.description.strip(), body.lanes_blocked, u["name"], u["agency"], now_iso(), time.time()),
        )
        audit(c, u["id"], "incident_create", iid)
        row = c.execute("SELECT * FROM incidents WHERE id=?", (iid,)).fetchone()
    return {"incident": incident_out(row)}


@app.post("/api/v1/incidents/{incident_id}/clear")
def clear_incident(incident_id: str, sess: dict = Depends(require_officer)):
    with db() as c:
        row = c.execute("SELECT * FROM incidents WHERE id=?", (incident_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Incident not found")
        if row["status"] == "cleared":
            raise HTTPException(409, "Incident already cleared")
        c.execute(
            "UPDATE incidents SET status='cleared', cleared_at=?, cleared_by=? WHERE id=?",
            (now_iso(), sess["user"]["id"], incident_id),
        )
        audit(c, sess["user"]["id"], "incident_clear", incident_id)
        row = c.execute("SELECT * FROM incidents WHERE id=?", (incident_id,)).fetchone()
    return {"incident": incident_out(row)}


# Serve the built frontend (frontend/dist) when present, so one process can run everything.
_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(_dist):
    from fastapi.staticfiles import StaticFiles

    app.mount("/", StaticFiles(directory=_dist, html=True), name="frontend")
