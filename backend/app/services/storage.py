"""Private object storage for artwork and delivery proofs.

Production: Vercel Blob (BLOB_READ_WRITE_TOKEN) with private access, via its REST API. Files are only
served through /api/files/{id}, which checks the caller's right to the owning record.
Dev/test: a local, git-ignored .uploads/ directory (same location the Next.js app used).
"""
import hashlib
import secrets
from pathlib import Path
import httpx
from ..config import settings

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
SIGNATURES = [
    ("application/pdf", "pdf", b"%PDF"),
    ("image/png", "png", b"\x89PNG"),
    ("image/jpeg", "jpg", b"\xff\xd8\xff"),
    ("image/webp", "webp", b"RIFF"),
    ("model/gltf-binary", "glb", b"glTF"),
]
BLOB_API = "https://blob.vercel-storage.com"


def sniff(data: bytes):
    """Content type is decided from the bytes, never from the browser's claim."""
    return next(((t, e) for t, e, magic in SIGNATURES if data.startswith(magic)), None)


def _local_dir() -> Path:
    return (Path(__file__).resolve().parents[2] / settings().upload_dir).resolve()


def put_object(data: bytes, folder: str, ext: str, content_type: str) -> tuple[str, str]:
    key = f"{folder}/{secrets.token_hex(16)}.{ext}"
    sha = hashlib.sha256(data).hexdigest()
    token = settings().blob_read_write_token
    if token:
        r = httpx.put(f"{BLOB_API}/{key}", content=data, timeout=30, headers={
            "authorization": f"Bearer {token}", "x-api-version": "11", "x-content-type": content_type,
            "x-add-random-suffix": "0", "x-vercel-blob-access": "private"})
        r.raise_for_status()
        return f"blob:{r.json()['url']}", sha
    if settings().production:
        raise RuntimeError("BLOB_READ_WRITE_TOKEN is not configured")
    path = _local_dir() / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return f"local:{key}", sha


def get_object(storage_key: str) -> bytes | None:
    if storage_key.startswith("blob:"):
        token = settings().blob_read_write_token
        r = httpx.get(storage_key[5:], headers={"authorization": f"Bearer {token}"}, timeout=30)
        return r.content if r.status_code == 200 else None
    if storage_key.startswith("local:"):
        base = _local_dir()
        full = (base / storage_key[6:]).resolve()
        if base not in full.parents:
            return None
        return full.read_bytes() if full.is_file() else None
    return None
