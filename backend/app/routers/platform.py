"""Files, Razorpay webhooks, cron jobs, language preference."""
import hmac
import json
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from sqlalchemy import Connection
from ..auth import CurrentUser, current_user, require_user
from ..config import settings
from ..db import get_conn, one, run
from ..notify import dispatch_queued
from ..services import files, payments, programmes
from ..services.common import is_uuid
from ..services.razorpay import verify_webhook_signature
from ..services.storage import get_object

router = APIRouter(prefix="/api", tags=["platform"])


@router.get("/files/{file_id}")
def download(file_id: str, user: CurrentUser | None = Depends(current_user), conn: Connection = Depends(get_conn)):
    if not user:
        return Response("Unauthorized", status_code=401)
    f = one(conn, "select * from files where id = :id", id=file_id) if is_uuid(file_id) else None
    if not f or not files.can_read_file(conn, user, f):
        return Response("Not found", status_code=404)
    body = get_object(f["storage_key"])
    if body is None:
        return Response("Not found", status_code=404)
    return Response(body, media_type=f["content_type"], headers={
        "content-disposition": f'attachment; filename="{f["filename"].replace(chr(34), "")}"',
        "x-content-type-options": "nosniff", "cache-control": "private, no-store"})


@router.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request, conn: Connection = Depends(get_conn)):
    raw = await request.body()
    if not verify_webhook_signature(raw, request.headers.get("x-razorpay-signature")):
        return JSONResponse({"error": "invalid_signature"}, status_code=401)
    event_id = request.headers.get("x-razorpay-event-id")
    if not event_id:
        return JSONResponse({"error": "missing_event_id"}, status_code=400)
    try:
        evt = json.loads(raw)
    except ValueError:
        return JSONResponse({"error": "invalid_json"}, status_code=400)
    return {"result": payments.apply_razorpay_event(conn, event_id, evt)}


def _cron_ok(request: Request) -> bool:
    secret = settings().cron_secret
    given = (request.headers.get("authorization") or "").removeprefix("Bearer ")
    return bool(secret) and hmac.compare_digest(given.encode(), secret.encode())


@router.get("/cron/notifications")
def cron_notifications(request: Request):
    if not _cron_ok(request):
        return JSONResponse({"error": "unauthorized"}, status_code=401)
    return {"attempted": dispatch_queued()}


@router.get("/cron/programmes")
def cron_programmes(request: Request):
    if not _cron_ok(request):
        return JSONResponse({"error": "unauthorized"}, status_code=401)
    return {"raised": programmes.run_due_programmes()}


class LocaleIn(BaseModel):
    locale: str


@router.post("/me/locale")
def set_locale(body: LocaleIn, user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    if body.locale not in ("en", "hi"):
        raise HTTPException(400, "Unsupported language.")
    run(conn, "update users set locale = :l where id = cast(:u as uuid)", l=body.locale, u=user.id)
    return {"ok": True}
