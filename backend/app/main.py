import threading
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .config import settings
from .errors import CommerceError
from .notify import begin_request, dispatch_one
from .routers import admin, auth, platform, portal, store

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
