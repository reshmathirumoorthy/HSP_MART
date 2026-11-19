import json
import uuid
from conftest import login, make_user, sql
from app.db import engine
from app.services import ai
from app.services.courier import poll_tracking


def _ready_order() -> str:
    number = f"O-CR-{uuid.uuid4().hex[:8].upper()}"
    c = sql("""insert into customers (kind, name, email, dedupe_key) values ('organisation', 'Courier Co', :e, :e) returning id""",
            e=f"cr-{uuid.uuid4().hex[:6]}@hsp.test")
    addr = json.dumps({"name": "Asha", "phone": "9876543210", "line1": "1 MG Road", "city": "Pune", "state": "Maharashtra", "pincode": "411001"})
    o = sql("""insert into orders (number, customer_id, status, subtotal_paise, gst_paise, total_paise, paid_paise, shipping_address)
               values (:n, :c, 'po_issued', 42000, 7560, 49560, 49560, cast(:a as jsonb)) returning id""", n=number, c=c["id"], a=addr)
    sql("""insert into order_lines (order_id, product_id, quantity, unit_price_paise, gst_rate_bps)
           values (:o, 'executive-notebook-01', 1, 42000, 1800)""", o=o["id"])
    return number


def test_book_courier_then_tracking_marks_delivered(admin):
    number = _ready_order()
    r = admin.post(f"/api/admin/orders/{number}/steps", data={"step": "book_courier"})
    assert r.status_code == 200, r.text
    awb = r.json()["result"]["awb"]
    assert awb.startswith("SIM")
    sh = admin.get(f"/api/admin/orders/{number}").json()["shipments"][0]
    assert sh["trackingNumber"] == awb and sh["trackingStatus"] == "booked"

    poll_tracking()
    assert admin.get(f"/api/admin/orders/{number}").json()["order"]["status"] == "dispatched"
    sql("""update shipments set dispatched_at = now() - interval '3 days'
           where order_id = (select id from orders where number = :n)""", n=number)
    result = poll_tracking()
    assert number in result["delivered"]
    d = admin.get(f"/api/admin/orders/{number}").json()
    assert d["order"]["status"] == "delivered" and awb in d["shipments"][0]["deliveryProofUrl"]


def test_book_courier_guards(admin):
    number = _ready_order()
    sql("update orders set paid_paise = 0 where number = :n", n=number)
    r = admin.post(f"/api/admin/orders/{number}/steps", data={"step": "book_courier"})
    assert r.status_code == 400 and "Full payment" in r.json()["detail"]


def test_tally_exports_processed_refunds():
    fin = login(make_user("hsp_finance"))
    number = _ready_order()
    o = sql("select id from orders where number = :n", n=number)
    u = sql("select id from users where role = 'hsp_finance' limit 1")
    cn = f"CN-T-{uuid.uuid4().hex[:6]}"
    sql("""insert into credit_notes (number, order_id, reason, lines, taxable_paise, gst_paise, total_paise, status,
                                     refund_paise, refund_status, created_by)
           values (:n, :o, 'Damaged in transit', '[]'::jsonb, 10000, 1800, 11800, 'approved', 11800, 'processed', :u)""",
        n=cn, o=o["id"], u=u["id"])
    xml = fin.get("/api/admin/exports/tally").text
    voucher = xml.split(f"RFND-{cn}")[1].split("</VOUCHER>")[0]
    assert "Courier Co" in voucher and "Razorpay Clearing" in voucher and "118.00" in voucher


def test_search_ranks_by_meaning_of_words_and_tolerates_typos():
    with engine().begin() as conn:
        top = ai.discover_products(conn, query="notebok", limit=3)
    assert any("notebook" in p["name"].lower() for p in top)


def test_products_api_never_exposes_embedding(admin):
    assert "embedding" not in admin.get("/api/admin/products/executive-notebook-01").json()
    assert admin.get("/api/admin/search/status").json()["semantic"] is False
