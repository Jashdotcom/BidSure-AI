"""SQLite persistence for real application audit events."""
import json
import os
import re
import sqlite3
import threading
from typing import Any, Dict, List

DATABASE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "audit.sqlite3"))
_lock = threading.RLock()
_SENSITIVE_KEY = re.compile(r"password|token|secret|authorization|api.?key|file.?bytes|document.?content|document.?text", re.I)


def _safe_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _safe_value(item) for key, item in value.items() if not _SENSITIVE_KEY.search(str(key))}
    if isinstance(value, (list, tuple)):
        return [_safe_value(item) for item in value]
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def _connect() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            user_email TEXT NOT NULL DEFAULT '',
            user_role TEXT NOT NULL DEFAULT 'UNKNOWN',
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL DEFAULT '',
            entity_id TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'SUCCESS',
            integrity_hash TEXT NOT NULL DEFAULT '',
            payload_json TEXT NOT NULL
        )
    """)
    connection.execute("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)")
    connection.execute("CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_email)")
    return connection


def save_audit_event(event: Dict[str, Any]) -> Dict[str, Any]:
    safe_event = _safe_value(event)
    with _lock, _connect() as connection:
        connection.execute(
            """INSERT OR IGNORE INTO audit_logs
               (id, timestamp, user_email, user_role, action, entity_type, entity_id, status, integrity_hash, payload_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                str(safe_event["id"]), str(safe_event["timestamp"]), str(safe_event.get("user_email") or safe_event.get("actor") or ""),
                str(safe_event.get("user_role") or "UNKNOWN"), str(safe_event.get("action") or "UNKNOWN"),
                str(safe_event.get("entity_type") or ""), str(safe_event.get("entity_id") or safe_event.get("target") or ""),
                str(safe_event.get("status") or "SUCCESS"), str(safe_event.get("integrity_hash") or ""),
                json.dumps(safe_event, ensure_ascii=False, separators=(",", ":")),
            ),
        )
    return safe_event


def get_audit_events() -> List[Dict[str, Any]]:
    with _lock, _connect() as connection:
        rows = connection.execute("SELECT payload_json FROM audit_logs ORDER BY timestamp DESC, rowid DESC").fetchall()
    return [json.loads(row["payload_json"]) for row in rows]
