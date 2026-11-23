"""Sessions are interoperable with the Next.js app: same `hsp_session` HS256 JWT and `sessions` table."""
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy import Connection
from .config import settings
from .db import get_conn, one, run

SESSION_COOKIE = "hsp_session"
SESSION_TTL = timedelta(days=7)
STAFF_ROLES = ("hsp_admin", "hsp_finance", "hsp_procurement")
PARTNER_ROLES = ("associate", "franchise", "enterprise_partner")


@dataclass(frozen=True)
class CurrentUser:
    id: str
    session_id: str
    email: str | None
    phone: str | None
    name: str | None
    role: str
    locale: str


def read_token(token: str | None) -> dict | None:
    if not token:
        return None
    try:
        return jwt.decode(token, settings().session_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


def current_user(request: Request, conn: Connection = Depends(get_conn)) -> CurrentUser | None:
    payload = read_token(request.cookies.get(SESSION_COOKIE))
    if not payload or "sid" not in payload:
        return None
    row = one(
        conn,
        """select u.id::text, u.email, u.phone, u.name, u.role::text as role, u.locale, u.active
           from sessions s join users u on u.id = s.user_id
           where s.id = cast(:sid as uuid) and s.revoked_at is null and s.expires_at > now()""",
        sid=payload["sid"],
    )
    if not row or not row["active"]:
        return None
    # Role is always read from the DB, never trusted from the token.
    return CurrentUser(row["id"], payload["sid"], row["email"], row["phone"], row["name"], row["role"], row["locale"])


def require_user(user: CurrentUser | None = Depends(current_user)) -> CurrentUser:
    if not user:
        raise HTTPException(401, "Sign in required.")
    return user


def require_roles(*roles: str):
    def dep(user: CurrentUser = Depends(require_user)) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(403, "You do not have access to this.")
        return user

    return dep


require_staff = require_roles(*STAFF_ROLES)


def create_session(conn: Connection, response: Response, user_id: str, role: str):
    expires = datetime.now(timezone.utc) + SESSION_TTL
    sid = one(conn, "insert into sessions (user_id, expires_at) values (cast(:u as uuid), :e) returning id::text",
              u=user_id, e=expires)["id"]
    token = jwt.encode({"sid": sid, "uid": user_id, "role": role, "iat": int(datetime.now(timezone.utc).timestamp()),
                        "exp": int(expires.timestamp())}, settings().session_secret, algorithm="HS256")
    response.set_cookie(SESSION_COOKIE, token, httponly=True, secure=settings().production, samesite="lax",
                        path="/", expires=expires, domain=settings().session_cookie_domain or None)


def destroy_session(conn: Connection, request: Request, response: Response):
    payload = read_token(request.cookies.get(SESSION_COOKIE))
    if payload and "sid" in payload:
        run(conn, "update sessions set revoked_at = now() where id = cast(:sid as uuid)", sid=payload["sid"])
    response.delete_cookie(SESSION_COOKIE, path="/", domain=settings().session_cookie_domain or None)
