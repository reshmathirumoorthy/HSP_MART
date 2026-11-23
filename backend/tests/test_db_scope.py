"""The request transaction must commit before the response is sent (see app/db.get_conn)."""
from fastapi.dependencies.models import Dependant
from app.db import get_conn
from app.main import app


def _deps(dep: Dependant):
    for d in dep.dependencies:
        yield d
        yield from _deps(d)


def _routes(routes):
    """Flatten routes, including those inside included routers (wrapped in this FastAPI version)."""
    for r in routes:
        inner = getattr(r, "original_router", None)
        if inner is not None:
            yield from _routes(inner.routes)
        else:
            yield r


def test_every_route_commits_before_responding():
    late, checked = [], 0
    for route in _routes(app.router.routes):
        dependant = getattr(route, "dependant", None)
        if dependant is None:
            continue
        checked += 1
        for d in _deps(dependant):
            if d.call is get_conn and d.scope != "function":
                late.append(getattr(route, "path", "?"))
    assert checked > 100, f"only {checked} routes inspected"
    assert late == [], f"get_conn without scope='function' (commits after the response): {sorted(set(late))}"


def test_a_written_row_is_visible_as_soon_as_the_response_arrives(anon):
    """Issue a sign-in code and verify it immediately; the code must already be committed."""
    import uuid
    email = f"py-race-{uuid.uuid4().hex[:8]}@hsp.test"
    code = anon.post("/api/auth/otp", json={"identifier": email}).json()["devCode"]
    assert anon.post("/api/auth/verify", json={"identifier": email, "code": code}).status_code == 200
