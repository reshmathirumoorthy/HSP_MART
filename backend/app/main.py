import logging
import threading
import time
import uuid
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .config import settings
from .errors import CommerceError
from .notify import begin_request, dispatch_one
from .routers import admin, auth, platform, portal, store

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("hsp.api")

# The API returns JSON only, so it can forbid framing and content sniffing outright; nothing it returns should be
# cached by shared proxies because responses depend on the session cookie.
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
}

app = FastAPI(title="HSP GiftOS API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings().cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["content-type"],
)


@app.middleware("http")
async def send_notifications_after_commit(request: Request, call_next):
    """Messages queued during a request are sent once its transaction has committed (outbox pattern)."""
    pending = begin_request()
    response = await call_next(request)
    if pending:
        ids = list(pending)
        threading.Thread(target=lambda: [dispatch_one(i) for i in ids], daemon=True).start()
    return response


@app.middleware("http")
async def log_and_secure(request: Request, call_next):
    """One log line per request (method, path, status, duration, request id) plus security headers.
    Query strings are not logged: they can carry search terms or tokens."""
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        log.exception("unhandled error id=%s %s %s", request_id, request.method, request.url.path)
        response = JSONResponse({"detail": "Something went wrong. Please try again.", "requestId": request_id},
                                status_code=500)
    ms = (time.perf_counter() - start) * 1000
    if request.url.path != "/api/health":
        level = logging.WARNING if response.status_code >= 500 else logging.INFO
        log.log(level, "%s %s %s %.0fms id=%s", request.method, request.url.path, response.status_code, ms, request_id)
    for k, v in SECURITY_HEADERS.items():
        response.headers.setdefault(k, v)
    response.headers["X-Request-Id"] = request_id
    if request.url.path.startswith(("/api/admin", "/api/auth", "/api/account", "/api/my", "/api/partner", "/api/supplier")):
        response.headers.setdefault("Cache-Control", "no-store")
    return response


@app.exception_handler(CommerceError)
def commerce_error(_: Request, exc: CommerceError):
    return JSONResponse({"detail": str(exc)}, status_code=400)


@app.get("/api/health")
def health():
    return {"ok": True}


app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(portal.router)
app.include_router(store.router)
app.include_router(platform.router)
