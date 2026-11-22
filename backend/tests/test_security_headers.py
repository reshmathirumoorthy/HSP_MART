from fastapi import APIRouter
from fastapi.testclient import TestClient
from app.main import app


def test_api_responses_carry_security_headers_and_a_request_id(anon):
    r = anon.get("/api/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert "frame-ancestors 'none'" in r.headers["content-security-policy"]
    assert len(r.headers["x-request-id"]) >= 8
    assert anon.get("/api/health", headers={"x-request-id": "trace-123"}).headers["x-request-id"] == "trace-123"


def test_private_responses_are_not_cacheable(anon):
    assert anon.get("/api/auth/me").headers["cache-control"] == "no-store"
    assert "cache-control" not in anon.get("/api/health").headers


def test_unexpected_errors_are_logged_and_hidden(caplog):
    router = APIRouter()

    @router.get("/api/__boom")
    def boom():
        raise RuntimeError("internal detail that must not leak")

    app.include_router(router)
    try:
        r = TestClient(app, raise_server_exceptions=False).get("/api/__boom")
    finally:
        app.router.routes[:] = [rt for rt in app.router.routes if getattr(rt, "path", "") != "/api/__boom"]
    assert r.status_code == 500
    assert "internal detail" not in r.text and r.json()["requestId"] == r.headers["x-request-id"]
    assert any("unhandled error" in m and "/api/__boom" in m for m in caplog.messages)
