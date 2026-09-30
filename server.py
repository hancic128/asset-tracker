#!/usr/bin/env python3
"""asset-tracker — 订阅与储值卡管理的自托管后端。

单文件、仅标准库：SQLite 存储 + 口令登录 + REST API + 前端静态托管 +
每日 webhook 摘要。部署形态见 app-deploy/services/asset-tracker。
"""

import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import sys
import threading
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

HOST = os.environ.get("ASSET_HOST", "0.0.0.0")
PORT = int(os.environ.get("ASSET_PORT", "8085"))
DB_PATH = os.environ.get("ASSET_DB", "/opt/asset-tracker/asset-tracker.db")
STATIC_DIR = os.environ.get("ASSET_STATIC", "/app/static")
VERSION = os.environ.get("ASSET_VERSION", "dev")
INITIAL_PASSWORD = os.environ.get("ASSET_INITIAL_PASSWORD", "")

# 容器进程启动时间。/health 把它一起返回给前端 footer 展示「部署时间」。
# 这里取的是 server.py 加载时刻 = 容器第一次启动 = 本次镜像部署时间。
DEPLOYED_AT = datetime.now(timezone.utc).isoformat()

SESSION_DAYS = 30
PBKDF2_ROUNDS = 200_000
DIGEST_HOUR = int(os.environ.get("ASSET_DIGEST_HOUR", "9"))

# ---------------------------------------------------------------- database

SCHEMA = """
CREATE TABLE IF NOT EXISTS auth (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  username      TEXT NOT NULL DEFAULT 'owner',
  password_hash TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS subscriptions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT    NOT NULL,
  amount         REAL    NOT NULL DEFAULT 0,
  currency       TEXT    NOT NULL DEFAULT 'CNY',
  period_preset  TEXT    NOT NULL DEFAULT 'month',
  period_days    INTEGER NOT NULL DEFAULT 30,
  start_date     TEXT,
  end_date       TEXT,
  category       TEXT,
  status         TEXT    NOT NULL DEFAULT 'active',
  remind_enabled INTEGER NOT NULL DEFAULT 0,
  remind_date    TEXT,
  notes          TEXT,
  created_at     TEXT    NOT NULL,
  updated_at     TEXT    NOT NULL
);
CREATE TABLE IF NOT EXISTS stored_value_cards (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  type             TEXT    NOT NULL DEFAULT 'amount',
  category         TEXT,
  currency         TEXT    NOT NULL DEFAULT 'CNY',
  initial_amount   REAL    NOT NULL DEFAULT 0,
  remaining_amount REAL    NOT NULL DEFAULT 0,
  initial_uses     INTEGER NOT NULL DEFAULT 0,
  remaining_uses   INTEGER NOT NULL DEFAULT 0,
  expires_at       TEXT,
  status           TEXT    NOT NULL DEFAULT 'active',
  remind_enabled   INTEGER NOT NULL DEFAULT 0,
  remind_date      TEXT,
  notes            TEXT,
  created_at       TEXT    NOT NULL,
  updated_at       TEXT    NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL
);
"""

_db_lock = threading.Lock()


def connect():
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)
    if INITIAL_PASSWORD and not password_is_set():
        set_password(INITIAL_PASSWORD)
        log("bootstrap password set from ASSET_INITIAL_PASSWORD")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def log(*parts):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]", *parts, flush=True)


# ---------------------------------------------------------------- auth

def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ROUNDS)
    return f"pbkdf2_sha256${PBKDF2_ROUNDS}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(password: str, stored: str) -> bool:
    # 空口令无条件拒绝。这不是多余的：只要谁把「空串的哈希」写进 auth 表，
    # 缺了这一行就变成「空口令可登录」——2026-09-30 手工重置口令时真踩过一次。
    if not password or not stored:
        return False
    try:
        _, rounds, salt_b64, hash_b64 = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), base64.b64decode(salt_b64), int(rounds))
        return hmac.compare_digest(dk, base64.b64decode(hash_b64))
    except Exception:
        return False


def password_is_set() -> bool:
    with connect() as conn:
        row = conn.execute("SELECT password_hash FROM auth WHERE id = 1").fetchone()
    return bool(row and row["password_hash"])


def set_password(password: str):
    if not password:
        raise ValueError("refusing to store an empty password")
    with _db_lock, connect() as conn:
        conn.execute(
            "INSERT INTO auth (id, username, password_hash, updated_at) VALUES (1, 'owner', ?, ?) "
            "ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash, updated_at = excluded.updated_at",
            (hash_password(password), now_iso()),
        )


def create_session() -> str:
    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)).isoformat()
    with _db_lock, connect() as conn:
        conn.execute("DELETE FROM sessions WHERE expires_at < ?", (now_iso(),))
        conn.execute(
            "INSERT INTO sessions (token, created_at, expires_at) VALUES (?, ?, ?)",
            (token, now_iso(), expires),
        )
    return token


def session_valid(token: str | None) -> bool:
    if not token:
        return False
    with connect() as conn:
        row = conn.execute("SELECT expires_at FROM sessions WHERE token = ?", (token,)).fetchone()
    return bool(row and row["expires_at"] > now_iso())


def drop_session(token: str | None):
    if not token:
        return
    with _db_lock, connect() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


# ---------------------------------------------------------------- helpers

SUB_FIELDS = [
    "name", "amount", "currency", "period_preset", "period_days", "start_date",
    "end_date", "category", "status", "remind_enabled", "remind_date", "notes",
]
CARD_FIELDS = [
    "name", "type", "category", "currency", "initial_amount", "remaining_amount",
    "initial_uses", "remaining_uses", "expires_at", "status", "remind_enabled",
    "remind_date", "notes",
]
NUMERIC_SUB = {"amount", "period_days"}
NUMERIC_CARD = {
    "initial_amount", "remaining_amount", "initial_uses", "remaining_uses",
}
BOOL_FIELDS = {"remind_enabled"}


def coerce(field: str, value, numeric: set[str]):
    if field in BOOL_FIELDS:
        return 1 if value else 0
    if field in numeric:
        try:
            return float(value) if field in {"amount", "initial_amount", "remaining_amount"} else int(float(value))
        except (TypeError, ValueError):
            return 0
    if value in (None, ""):
        return None
    return str(value).strip()


def clean_rows(rows):
    out = []
    for r in rows:
        d = dict(r)
        if "remind_enabled" in d:
            d["remind_enabled"] = bool(d["remind_enabled"])
        out.append(d)
    return out


# ---------------------------------------------------------------- webhook

def http_post_json(url: str, payload: dict, token: str | None, timeout: int = 15):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", "replace")
            return {"ok": True, "status": resp.status, "body": body[:300]}
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code, "body": e.read().decode("utf-8", "replace")[:300]}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "status": 0, "error": str(e)[:300]}


def build_digest(conn):
    today = date.today()
    settings = {r["key"]: r["value"] for r in conn.execute("SELECT key, value FROM settings")}
    subs = [dict(r) for r in conn.execute("SELECT * FROM subscriptions WHERE status = 'active'")]
    cards = [dict(r) for r in conn.execute("SELECT * FROM stored_value_cards WHERE status = 'active'")]

    def days_until(iso):
        if not iso:
            return None
        try:
            return (datetime.strptime(iso[:10], "%Y-%m-%d").date() - today).days
        except Exception:  # noqa: BLE001
            return None

    def within(days, low, high):
        return days is not None and low <= days <= high

    # 以下判据必须与前端 src/lib/reminders.ts 的 collectReminders 完全一致，
    # 否则「页面内提醒」与「每日 webhook」会各说各话（历史上就是这样）。
    DUE_WINDOW_DAYS, CARD_WINDOW_DAYS = 7, 30

    due = []
    for s in subs:
        d = days_until(s["end_date"])
        if within(d, 0, DUE_WINDOW_DAYS):
            due.append((d, s))
    due.sort(key=lambda t: t[0])

    expiring = []
    for c in cards:
        d = days_until(c["expires_at"])
        if within(d, 0, CARD_WINDOW_DAYS):
            expiring.append((d, c))
    expiring.sort(key=lambda t: t[0])

    # 用户手填的「到期续费提醒」日期（remind_enabled + remind_date）。
    # 口径：到日即响（d <= 0），不设上界；也不设下界——续订会把旧周期置 renewed，
    # 该项随即离开 active，所以不会无限期地响下去。
    # 只取没被上面两块覆盖的项，避免同一项在通知里出现两次。
    sub_covered = {s["id"] for _, s in due}
    card_covered = {c["id"] for _, c in expiring}
    reminded = []
    for s in subs:
        d = days_until(s["remind_date"])
        if s["remind_enabled"] and s["id"] not in sub_covered and d is not None and d <= 0:
            reminded.append((d, s))
    reminded_cards = []
    for c in cards:
        d = days_until(c["remind_date"])
        if c["remind_enabled"] and c["id"] not in card_covered and d is not None and d <= 0:
            reminded_cards.append((d, c))
    reminded.sort(key=lambda t: t[0])
    reminded_cards.sort(key=lambda t: t[0])

    if not due and not expiring and not reminded and not reminded_cards:
        return None, settings

    def when(d):
        # 自设提醒的 d 可能为负（已过日），别一律说成「今天」
        if d < 0:
            return f"已过 {-d} 天"
        return "今天" if d == 0 else f"{d} 天后"

    lines = []
    if due:
        lines.append(f"订阅（{len(due)}）")
        for d, s in due:
            lines.append(f"· {s['name']}  ¥{float(s['amount']):.2f} · {when(d)}（{s['end_date']}）")
    if expiring:
        if lines:
            lines.append("")
        lines.append(f"储值卡（{len(expiring)}）")
        for d, c in expiring:
            lines.append(f"· {c['name']} · {when(d)}（{c['expires_at']}）")
    if reminded or reminded_cards:
        if lines:
            lines.append("")
        lines.append(f"你设的提醒（{len(reminded) + len(reminded_cards)}）")
        for d, s in reminded:
            lines.append(f"· {s['name']} · {when(d)}（{s['remind_date']}）")
        for d, c in reminded_cards:
            lines.append(f"· {c['name']} · {when(d)}（{c['remind_date']}）")

    total = len(due) + len(expiring) + len(reminded) + len(reminded_cards)
    payload = {
        "title": f"资产管理 · {len(due)} 个订阅待扣费 / {len(expiring)} 张卡待过期"
        + (f" / {len(reminded) + len(reminded_cards)} 条你设的提醒" if reminded or reminded_cards else ""),
        "body": "\n".join(lines),
        "event": "asset_tracker.digest",
        "repo": "asset-tracker",
        "type": "asset_tracker.digest",
        "at": now_iso(),
        "upcoming_subscriptions": [
            {"name": s["name"], "amount": float(s["amount"]), "days": d, "end_date": s["end_date"], "category": s["category"]}
            for d, s in due
        ],
        "expiring_cards": [
            {"name": c["name"], "type": c["type"], "days": d, "expires_at": c["expires_at"],
             "remaining_amount": float(c["remaining_amount"]), "remaining_uses": c["remaining_uses"]}
            for d, c in expiring
        ],
        "reminders": [
            {"name": s["name"], "kind": "subscription", "days": d, "remind_date": s["remind_date"]}
            for d, s in reminded
        ]
        + [
            {"name": c["name"], "kind": "card", "days": d, "remind_date": c["remind_date"]}
            for d, c in reminded_cards
        ],
        "summary": {
            "upcoming_subscriptions_count": len(due),
            "expiring_cards_count": len(expiring),
            "reminders_count": len(reminded) + len(reminded_cards),
            "total": total,
        },
    }
    return payload, settings


def run_digest(force: bool = False) -> dict:
    with connect() as conn:
        payload, settings = build_digest(conn)
    url = (settings.get("asset_tracker_webhook_url") or "").strip()
    enabled = (settings.get("asset_tracker_webhook_enabled") or "").lower() == "true"
    token = (settings.get("asset_tracker_webhook_token") or "").strip()

    if not url:
        return {"ok": True, "skipped": "no_url"}
    if not enabled and not force:
        return {"ok": True, "skipped": "disabled"}
    if payload is None:
        return {"ok": True, "skipped": "nothing_to_report"}

    result = http_post_json(url, payload, token)
    result["posted"] = len(payload["upcoming_subscriptions"]) + len(payload["expiring_cards"])
    log("digest posted:", result.get("status"), result.get("error", ""))
    return result


def digest_loop():
    """每天 DIGEST_HOUR 点跑一次摘要（容器内线程，无需外部 cron）。"""
    while True:
        now = datetime.now()
        nxt = now.replace(hour=DIGEST_HOUR, minute=0, second=0, microsecond=0)
        if nxt <= now:
            nxt += timedelta(days=1)
        time.sleep(max(30.0, (nxt - now).total_seconds()))
        try:
            run_digest()
        except Exception as e:  # noqa: BLE001
            log("digest failed:", e)


# ---------------------------------------------------------------- http

MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".webmanifest": "application/manifest+json",
    ".woff2": "font/woff2",
}


class Handler(BaseHTTPRequestHandler):
    server_version = "asset-tracker"
    protocol_version = "HTTP/1.1"

    # ---- plumbing
    def log_message(self, fmt, *args):  # quieter, single-line
        log("http", self.address_string(), fmt % args)

    def _send(self, code, body: bytes, ctype="application/json; charset=utf-8", extra=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, code, obj):
        self._send(code, json.dumps(obj, ensure_ascii=False).encode())

    def _body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode())
        except Exception:  # noqa: BLE001
            return None

    def _token(self):
        auth = self.headers.get("Authorization") or ""
        return auth[7:].strip() if auth.lower().startswith("bearer ") else None

    def _authed(self):
        if session_valid(self._token()):
            return True
        self._json(401, {"error": "unauthorized"})
        return False

    # ---- verbs
    def do_GET(self):
        self._route("GET")

    def do_POST(self):
        self._route("POST")

    def do_PATCH(self):
        self._route("PATCH")

    def do_PUT(self):
        self._route("PUT")

    def do_DELETE(self):
        self._route("DELETE")

    def do_HEAD(self):
        self._route("GET")

    # ---- routing
    def _route(self, method):
        path = unquote(urlparse(self.path).path)
        try:
            if path.startswith("/api/"):
                self._api(method, path)
            else:
                self._static(path)
        except Exception as e:  # noqa: BLE001
            log("error", path, repr(e))
            self._json(500, {"error": "internal_error", "detail": str(e)[:200]})

    # ---- API
    def _api(self, method, path):
        parts = [p for p in path.split("/") if p]  # ['api', ...]
        rest = parts[1:]

        # public
        if rest == ["session"] and method == "GET":
            return self._json(200, {"initialized": password_is_set(), "authenticated": session_valid(self._token())})
        if rest == ["login"] and method == "POST":
            return self._login()
        if rest == ["setup"] and method == "POST":
            return self._setup()
        if rest == ["health"] and method == "GET":
            return self._json(200, {"ok": True, "version": VERSION, "deployedAt": DEPLOYED_AT})

        if not self._authed():
            return

        if rest == ["logout"] and method == "POST":
            drop_session(self._token())
            return self._json(200, {"ok": True})
        if rest == ["password"] and method == "POST":
            return self._change_password()

        if rest == ["settings"] and method == "GET":
            with connect() as conn:
                rows = conn.execute("SELECT key, value FROM settings").fetchall()
            return self._json(200, {r["key"]: r["value"] for r in rows})

        if len(rest) == 2 and rest[0] == "settings" and method == "PUT":
            data = self._body()
            if data is None:
                return self._json(400, {"error": "bad_json"})
            value = "" if data.get("value") is None else str(data.get("value"))
            with _db_lock, connect() as conn:
                conn.execute(
                    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) "
                    "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
                    (rest[1], value, now_iso()),
                )
            return self._json(200, {"ok": True})

        if rest == ["export"] and method == "GET":
            with connect() as conn:
                subs = clean_rows(conn.execute("SELECT * FROM subscriptions ORDER BY id").fetchall())
                cards = clean_rows(conn.execute("SELECT * FROM stored_value_cards ORDER BY id").fetchall())
            return self._json(200, {"app": "asset-tracker", "version": 1, "exportedAt": now_iso(),
                                    "subscriptions": subs, "cards": cards})

        if rest == ["import"] and method == "POST":
            return self._import()

        if rest == ["webhook", "test"] and method == "POST":
            data = self._body() or {}
            url = (data.get("url") or "").strip()
            if not url:
                return self._json(400, {"error": "missing_url"})
            # 必须带 title/body：通用接收端（蓝鸟 _handle_generic）在既无 title 又无 body 时
            # 直接判为「没内容可推」返回 ignored，测试按钮就会永远显示「没反应」。
            res = http_post_json(
                url,
                {
                    "title": "资产管理 · webhook 测试",
                    "body": "这是一条测试通知。收到即说明 webhook 链路通了。",
                    "event": "asset_tracker.test",
                    "repo": "asset-tracker",
                    "type": "asset_tracker.test",
                    "at": now_iso(),
                },
                (data.get("token") or "").strip() or None,
            )
            return self._json(200, res)

        if rest == ["webhook", "run"] and method == "POST":
            return self._json(200, run_digest(force=True))

        table = {"subscriptions": ("subscriptions", SUB_FIELDS, NUMERIC_SUB),
                 "cards": ("stored_value_cards", CARD_FIELDS, NUMERIC_CARD)}.get(rest[0] if rest else "")
        if table:
            return self._crud(method, rest, *table)

        self._json(404, {"error": "not_found", "path": path})

    def _login(self):
        data = self._body()
        if data is None:
            return self._json(400, {"error": "bad_json"})
        if not password_is_set():
            return self._json(400, {"error": "not_initialized"})
        password = data.get("password") or ""
        if not password:
            # 空口令直接拒，连库都不查
            time.sleep(0.4)
            return self._json(401, {"error": "wrong_password"})
        with connect() as conn:
            row = conn.execute("SELECT password_hash FROM auth WHERE id = 1").fetchone()
        if not row or not verify_password(password, row["password_hash"]):
            time.sleep(0.4)  # damp brute force
            return self._json(401, {"error": "wrong_password"})
        return self._json(200, {"token": create_session()})

    def _setup(self):
        data = self._body()
        if data is None:
            return self._json(400, {"error": "bad_json"})
        password = data.get("password") or ""
        if password_is_set():
            return self._json(400, {"error": "already_set"})
        if len(password) < 6:
            return self._json(400, {"error": "weak_password"})
        set_password(password)
        return self._json(200, {"token": create_session()})

    def _change_password(self):
        data = self._body()
        if data is None:
            return self._json(400, {"error": "bad_json"})
        new = data.get("newPassword") or ""
        if len(new) < 6:
            return self._json(400, {"error": "weak_password"})
        with connect() as conn:
            row = conn.execute("SELECT password_hash FROM auth WHERE id = 1").fetchone()
        if not row or not verify_password(data.get("oldPassword") or "", row["password_hash"]):
            return self._json(401, {"error": "wrong_password"})
        set_password(new)
        with _db_lock, connect() as conn:  # other sessions are no longer trusted
            conn.execute("DELETE FROM sessions")
        return self._json(200, {"ok": True})

    def _crud(self, method, rest, table, fields, numeric):
        if method == "GET" and len(rest) == 1:
            with connect() as conn:
                rows = clean_rows(conn.execute(f"SELECT * FROM {table} ORDER BY id").fetchall())
            return self._json(200, rows)

        if method == "POST" and len(rest) == 1:
            data = self._body()
            if data is None:
                return self._json(400, {"error": "bad_json"})
            if not (data.get("name") or "").strip():
                return self._json(400, {"error": "name_required"})
            # only the columns actually supplied: everything else keeps its schema
            # default (a missing `currency` must not become NULL)
            provided = [f for f in fields if f in data]
            cols = ", ".join(provided + ["created_at", "updated_at"])
            marks = ", ".join("?" for _ in provided + ["created_at", "updated_at"])
            values = [coerce(f, data.get(f), numeric) for f in provided] + [now_iso(), now_iso()]
            with _db_lock, connect() as conn:
                cur = conn.execute(f"INSERT INTO {table} ({cols}) VALUES ({marks})", values)
                row = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (cur.lastrowid,)).fetchone()
            return self._json(200, clean_rows([row])[0])

        if len(rest) == 2 and rest[1].isdigit():
            rid = int(rest[1])
            if method == "PATCH":
                data = self._body()
                if data is None:
                    return self._json(400, {"error": "bad_json"})
                sets = [f for f in fields if f in data]
                if not sets:
                    return self._json(400, {"error": "nothing_to_update"})
                assignments = ", ".join(f"{f} = ?" for f in sets + ["updated_at"])
                values = [coerce(f, data.get(f), numeric) for f in sets] + [now_iso(), rid]
                with _db_lock, connect() as conn:
                    conn.execute(f"UPDATE {table} SET {assignments} WHERE id = ?", values)
                    row = conn.execute(f"SELECT * FROM {table} WHERE id = ?", (rid,)).fetchone()
                if row is None:
                    return self._json(404, {"error": "not_found"})
                return self._json(200, clean_rows([row])[0])
            if method == "DELETE":
                with _db_lock, connect() as conn:
                    cur = conn.execute(f"DELETE FROM {table} WHERE id = ?", (rid,))
                return self._json(200, {"ok": True, "deleted": cur.rowcount})

        self._json(404, {"error": "not_found"})

    def _import(self):
        data = self._body()
        if not isinstance(data, dict):
            return self._json(400, {"error": "bad_json"})
        subs = data.get("subscriptions") or []
        cards = data.get("cards") or []
        if not isinstance(subs, list) or not isinstance(cards, list):
            return self._json(400, {"error": "invalid_shape"})
        n = 0
        with _db_lock, connect() as conn:
            for table, rows, fields, numeric in (
                ("subscriptions", subs, SUB_FIELDS, NUMERIC_SUB),
                ("stored_value_cards", cards, CARD_FIELDS, NUMERIC_CARD),
            ):
                for r in rows:
                    if not isinstance(r, dict) or not (r.get("name") or "").strip():
                        continue
                    provided = [f for f in fields if f in r]
                    cols = ", ".join(provided + ["created_at", "updated_at"])
                    marks = ", ".join("?" for _ in provided + ["created_at", "updated_at"])
                    values = [coerce(f, r.get(f), numeric) for f in provided] + [now_iso(), now_iso()]
                    conn.execute(f"INSERT INTO {table} ({cols}) VALUES ({marks})", values)
                    n += 1
        return self._json(200, {"ok": True, "imported": n})

    # ---- static
    def _static(self, path):
        if path == "/health":
            return self._json(200, {"ok": True, "version": VERSION, "deployedAt": DEPLOYED_AT})
        rel = path.lstrip("/") or "index.html"
        full = os.path.normpath(os.path.join(STATIC_DIR, rel))
        if not full.startswith(os.path.abspath(STATIC_DIR)):
            return self._send(403, b"forbidden", "text/plain")
        if not os.path.isfile(full):
            # SPA fallback: unknown paths serve index.html
            full = os.path.join(STATIC_DIR, "index.html")
            if not os.path.isfile(full):
                return self._send(404, b"not built", "text/plain")
        ext = os.path.splitext(full)[1].lower()
        with open(full, "rb") as fh:
            body = fh.read()
        cache = "no-store" if ext in {".html", ".webmanifest"} else "public, max-age=604800"
        self.send_response(200)
        self.send_header("Content-Type", MIME.get(ext, "application/octet-stream"))
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", cache)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)


def main():
    init_db()
    threading.Thread(target=digest_loop, daemon=True).start()
    srv = ThreadingHTTPServer((HOST, PORT), Handler)
    log(f"asset-tracker {VERSION} listening on {HOST}:{PORT}, db={DB_PATH}, static={STATIC_DIR}")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        srv.shutdown()


if __name__ == "__main__":
    sys.exit(main())
