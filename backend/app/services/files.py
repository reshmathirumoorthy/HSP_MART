"""Order documents: customer artwork (HSP sign-off before production) and delivery proofs."""
import re
from sqlalchemy import Connection
from ..audit import audit
from ..db import one, run
from ..errors import fail
from .common import STAFF_ROLES, customer_owns, is_uuid, supplier_for_user
from .storage import MAX_UPLOAD_BYTES, put_object, sniff


def _check(data: bytes):
    if not data:
        fail("Choose a file to upload.")
    if len(data) > MAX_UPLOAD_BYTES:
        fail("Files must be 10 MB or smaller.")
    return sniff(data) or fail("Upload a PDF, PNG, JPEG or WebP file.")


def safe_name(n: str) -> str:
    return re.sub(r"[^\w.\- ]+", "_", n or "")[:120] or "upload"


def _supplier_po(conn, user, order_id):
    s = supplier_for_user(conn, user.id) if user.role == "supplier" else None
    return one(conn, "select id from purchase_orders where order_id = :o and supplier_id = :s limit 1", o=order_id, s=s["id"]) if s else None


def upload_artwork(conn: Connection, user, order_number: str, filename: str, data: bytes):
    o = one(conn, "select * from orders where number = :n", n=order_number)
    if not o or (user.role not in STAFF_ROLES and not customer_owns(conn, user, o["customer_id"])):
        fail("Order not found.")
    if not o["requires_artwork"]:
        fail("This order has no branded items.")
    if o["status"] not in ("confirmed", "awaiting_artwork"):
        fail("Artwork can no longer be changed for this order.")
    ctype, ext = _check(data)
    key, sha = put_object(data, f"artwork/{o['id']}", ext, ctype)
    row = one(conn, """insert into files (kind, entity, entity_id, filename, content_type, size_bytes, sha256, storage_key,
                           uploaded_by, review_status)
                       values ('artwork', 'order', :e, :f, :c, :s, :h, :k, cast(:u as uuid), 'submitted') returning id::text""",
              e=str(o["id"]), f=safe_name(filename), c=ctype, s=len(data), h=sha, k=key, u=user.id)
    audit(conn, user, "artwork.upload", "file", row["id"], None, {"order": o["number"], "sha256": sha, "sizeBytes": len(data)})
    return row


def review_artwork(conn: Connection, actor, file_id: str, decision: str, note: str):
    if actor.role not in ("hsp_admin", "hsp_procurement"):
        fail("Only admin or procurement can review artwork.")
    if decision not in ("approved", "rejected"):
        fail("Unknown decision.")
    if decision == "rejected" and len(note.strip()) < 5:
        fail("Say what needs to change.")
    f = one(conn, "select * from files where id = :id", id=file_id) if is_uuid(file_id) else None
    if not f or f["kind"] != "artwork":
        fail("Artwork not found.")
    if f["review_status"] != "submitted":
        fail("Artwork already reviewed.")
    run(conn, "update files set review_status = :d, review_note = :n where id = :id", d=decision, n=note.strip() or None, id=file_id)
    audit(conn, actor, f"artwork.{decision}", "file", file_id, {"reviewStatus": "submitted"}, {"reviewStatus": decision, "note": note.strip()})


def upload_delivery_proof(conn: Connection, user, order_number: str, filename: str, data: bytes):
    o = one(conn, "select * from orders where number = :n", n=order_number) or fail("Order not found.")
    if user.role not in STAFF_ROLES and not _supplier_po(conn, user, o["id"]):
        fail("Order not found.")
    ctype, ext = _check(data)
    key, sha = put_object(data, f"proofs/{o['id']}", ext, ctype)
    row = one(conn, """insert into files (kind, entity, entity_id, filename, content_type, size_bytes, sha256, storage_key, uploaded_by)
                       values ('delivery_proof', 'order', :e, :f, :c, :s, :h, :k, cast(:u as uuid)) returning id::text""",
              e=str(o["id"]), f=safe_name(filename), c=ctype, s=len(data), h=sha, k=key, u=user.id)
    audit(conn, user, "delivery_proof.upload", "file", row["id"], None, {"order": o["number"], "sha256": sha})
    return row


def can_read_file(conn: Connection, user, f) -> bool:
    """Staff; the order's customer; the supplier holding a PO on the order."""
    if user.role in STAFF_ROLES:
        return True
    if f["entity"] != "order" or not is_uuid(f["entity_id"]):
        return False
    o = one(conn, "select id, customer_id from orders where id = cast(:id as uuid)", id=f["entity_id"])
    if not o:
        return False
    return customer_owns(conn, user, o["customer_id"]) or bool(_supplier_po(conn, user, o["id"]))
