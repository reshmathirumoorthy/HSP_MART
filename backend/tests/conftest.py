import os
import uuid
import pytest

os.environ.setdefault("DATABASE_URL", "postgres://localhost:5432/hsp_giftos_test")
os.environ["AUTH_DEV_OTP"] = "1"

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from app.db import engine  # noqa: E402
from app.main import app  # noqa: E402


def sql(q: str, **p):
    with engine().begin() as c:
        r = c.execute(text(q), p)
        return r.mappings().first() if r.returns_rows else None


def login(identifier: str) -> TestClient:
    client = TestClient(app)
    r = client.post("/api/auth/otp", json={"identifier": identifier})
    assert r.status_code == 200, r.text
    r = client.post("/api/auth/verify", json={"identifier": identifier, "code": r.json()["devCode"]})
    assert r.status_code == 200, r.text
    return client


def make_user(role: str) -> str:
    email = f"py-{role}-{uuid.uuid4().hex[:8]}@hsp.test"
    sql("insert into users (email, role) values (:e, cast(:r as role))", e=email, r=role)
    return email


@pytest.fixture
def admin():
    return login(make_user("hsp_admin"))


@pytest.fixture
def anon():
    return TestClient(app)
