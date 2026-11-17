"""Database access. The schema is owned by the Drizzle migrations in ../drizzle for now."""
from collections.abc import Iterator
from functools import lru_cache
from sqlalchemy import Connection, create_engine, text
from sqlalchemy.engine import Engine
from .config import settings


@lru_cache
def engine() -> Engine:
    return create_engine(settings().sqlalchemy_url, pool_size=10, pool_pre_ping=True)


def get_conn() -> Iterator[Connection]:
    """One transaction per request: commits on success, rolls back on any error. Services may
    commit part-way (e.g. before calling a payment provider) and carry on in a new transaction."""
    with engine().connect() as conn:
        try:
            yield conn
        except BaseException:
            conn.rollback()
            raise
        else:
            conn.commit()


def one(conn: Connection, sql: str, **params) -> dict | None:
    row = conn.execute(text(sql), params).mappings().first()
    return dict(row) if row is not None else None


def all_(conn: Connection, sql: str, **params):
    return [dict(r) for r in conn.execute(text(sql), params).mappings().all()]


def run(conn: Connection, sql: str, **params):
    return conn.execute(text(sql), params)
