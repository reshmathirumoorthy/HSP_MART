import hashlib
import hmac
import re
import secrets
from sqlalchemy import Connection
from ..config import settings
from ..db import one, run
from ..notify import notify

OTP_TTL_MIN = 10
MAX_ATTEMPTS = 5
MAX_REQUESTS_PER_WINDOW = 5
REQUEST_WINDOW_MIN = 15


def normalize_identifier(raw: str) -> str | None:
    """An email, or a 10-digit Indian mobile canonicalised to +91XXXXXXXXXX."""
    v = raw.strip().lower()
    if re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", v):
        return v
    digits = re.sub(r"^(91|0)(?=\d{10}$)", "", re.sub(r"\D", "", v))
    return f"+91{digits}" if re.fullmatch(r"[6-9]\d{9}", digits) else None


def _hash(identifier: str, code: str) -> str:
    return hmac.new(settings().session_secret.encode(), f"{identifier}:{code}".encode(), hashlib.sha256).hexdigest()


def issue_otp(conn: Connection, identifier: str) -> tuple[bool, str | None, str | None]:
    """Returns (ok, error, dev_code)."""
    n = one(conn, f"""select count(*)::int as n from otp_codes
                      where identifier = :i and created_at > now() - interval '{REQUEST_WINDOW_MIN} minutes'""",
            i=identifier)["n"]
    if n >= MAX_REQUESTS_PER_WINDOW:
        return False, "Too many codes requested. Try again in 15 minutes.", None
    code = f"{secrets.randbelow(1_000_000):06d}"
    run(conn, f"""insert into otp_codes (identifier, code_hash, expires_at)
                  values (:i, :h, now() + interval '{OTP_TTL_MIN} minutes')""", i=identifier, h=_hash(identifier, code))
    notify(conn, channel="email" if "@" in identifier else "sms", recipient=identifier, template="auth.otp",
           payload={"code": code}, redact=["code"])
    dev = settings().auth_dev_otp == "1" and not settings().production
    return True, None, code if dev else None


def verify_otp(conn: Connection, identifier: str, code: str) -> bool:
    row = one(conn, """select id, code_hash, attempts from otp_codes
                       where identifier = :i and consumed_at is null and expires_at > now()
                       order by created_at desc limit 1""", i=identifier)
    if not row or row["attempts"] >= MAX_ATTEMPTS:
        return False
    match = hmac.compare_digest(row["code_hash"], _hash(identifier, code.strip()))
    if match:
        run(conn, "update otp_codes set consumed_at = now() where id = :id", id=row["id"])
    else:
        run(conn, "update otp_codes set attempts = attempts + 1 where id = :id", id=row["id"])
    return match
