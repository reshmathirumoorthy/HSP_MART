import re
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy import Connection
from ..audit import audit
from ..auth import CurrentUser, create_session, current_user, destroy_session
from ..db import get_conn, one
from ..services.otp import issue_otp, normalize_identifier, verify_otp

router = APIRouter(prefix="/api/auth", tags=["auth"])


class OtpRequest(BaseModel):
    identifier: str


class OtpVerify(BaseModel):
    identifier: str
    code: str


@router.post("/otp")
def request_otp(body: OtpRequest, conn: Connection = Depends(get_conn, scope="function")):
    ident = normalize_identifier(body.identifier)
    if not ident:
        raise HTTPException(400, "Enter a valid email or 10-digit mobile number.")
    ok, err, dev = issue_otp(conn, ident)
    if not ok:
        raise HTTPException(429, err)
    return {"identifier": ident, "devCode": dev}


@router.post("/verify")
def verify(body: OtpVerify, response: Response, conn: Connection = Depends(get_conn, scope="function")):
    ident = normalize_identifier(body.identifier)
    # The failed-attempt counter must persist even though we reject: commit before raising.
    if not ident or not re.fullmatch(r"\d{6}", body.code.strip()) or not verify_otp(conn, ident, body.code):
        conn.commit()
        raise HTTPException(400, "That code is incorrect or has expired.")
    col = "email" if "@" in ident else "phone"
    user = one(conn, f"select id::text, role::text as role, active from users where {col} = :v", v=ident)
    if not user:
        user = one(conn, f"insert into users ({col}) values (:v) returning id::text, role::text as role, active", v=ident)
        audit(conn, _Actor(user["id"], user["role"]), "user.signup", "user", user["id"], None, {"role": user["role"]})
    if not user["active"]:
        conn.commit()
        raise HTTPException(403, "This account is disabled. Contact HSP support.")
    create_session(conn, response, user["id"], user["role"])
    audit(conn, _Actor(user["id"], user["role"]), "auth.login", "user", user["id"])
    return {"role": user["role"]}


@router.get("/me")
def me(user: CurrentUser | None = Depends(current_user)):
    if not user:
        raise HTTPException(401, "Sign in required.")
    return {"id": user.id, "email": user.email, "phone": user.phone, "name": user.name, "role": user.role,
            "locale": user.locale}


@router.post("/logout")
def logout(request: Request, response: Response, conn: Connection = Depends(get_conn, scope="function"),
           user: CurrentUser | None = Depends(current_user)):
    destroy_session(conn, request, response)
    if user:
        audit(conn, user, "auth.logout", "user", user.id)
    return {"ok": True}


class _Actor:
    def __init__(self, id: str, role: str):
        self.id, self.role = id, role
