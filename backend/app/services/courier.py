"""Courier booking and tracking (Blueprint §5 "Logistics: courier and fulfilment APIs").

Live: Shiprocket (aggregator: Delhivery, Blue Dart, Xpressbees, …) when SHIPROCKET_EMAIL/PASSWORD are set.
Otherwise a simulated courier issues SIM-… AWBs and reports delivery after SIM_DELIVERY_DAYS, so the whole
book → track → deliver flow can be tested. Delivery confirmed by the courier becomes the order's proof of delivery.
"""
import secrets
from datetime import datetime, timedelta, timezone
import httpx
from sqlalchemy import Connection
from ..audit import audit
from ..config import settings
from ..db import all_, engine, one, run
from ..errors import fail
from . import orders as order_svc
from .common import amount_due, net_paid
from .programmes import system_actor

API = "https://apiv2.shiprocket.in/v1/external"
SIM = "simulated"
DEFAULT_UNIT_WEIGHT_KG = 0.5  # until per-SKU weights are captured in the catalogue


def live() -> bool:
    st = settings()
    return bool(st.shiprocket_email and st.shiprocket_password)


def _token() -> str:
    st = settings()
    r = httpx.post(f"{API}/auth/login", json={"email": st.shiprocket_email, "password": st.shiprocket_password}, timeout=15)
    r.raise_for_status()
    return r.json()["token"]


def _shiprocket_book(o, lines, addr) -> dict:
    tok = _token()
    h = {"Authorization": f"Bearer {tok}"}
    units = sum(l["quantity"] for l in lines) or 1
    body = {
        "order_id": o["number"], "order_date": o["created_at"].strftime("%Y-%m-%d %H:%M"),
        "pickup_location": settings().shiprocket_pickup_location,
        "billing_customer_name": addr.get("name", ""), "billing_last_name": "", "billing_address": addr.get("line1", ""),
        "billing_address_2": addr.get("line2", ""), "billing_city": addr.get("city", ""), "billing_pincode": addr.get("pincode", ""),
        "billing_state": addr.get("state", ""), "billing_country": "India", "billing_email": addr.get("email", ""),
        "billing_phone": addr.get("phone", ""), "shipping_is_billing": True,
        "order_items": [{"name": l["name"][:100], "sku": l["sku"], "units": l["quantity"],
                         "selling_price": f"{l['unit_price_paise'] / 100:.2f}", "hsn": l["hsn_code"] or ""} for l in lines],
        "payment_method": "Prepaid", "sub_total": f"{o['subtotal_paise'] / 100:.2f}",
        "length": 30, "breadth": 25, "height": 15, "weight": round(units * DEFAULT_UNIT_WEIGHT_KG, 2),
    }
    r = httpx.post(f"{API}/orders/create/adhoc", headers=h, json=body, timeout=20)
    r.raise_for_status()
    shipment_id = r.json()["shipment_id"]
    a = httpx.post(f"{API}/courier/assign/awb", headers=h, json={"shipment_id": shipment_id}, timeout=20)
    a.raise_for_status()
    data = a.json()["response"]["data"]
    return {"provider": "shiprocket", "shipment_id": str(shipment_id), "awb": data["awb_code"], "courier": data["courier_name"]}


def book_and_dispatch(conn: Connection, actor, number: str) -> dict:
    """Validate, book with the courier, then dispatch the order with the courier's AWB."""
    o = order_svc.lock_order(conn, number)
    if o["status"] != "po_issued":
        fail("Order is not ready to dispatch.")
    if net_paid(o) < amount_due(o):
        fail("Full payment is required before dispatch.")
    addr = dict(o["shipping_address"] or {})
    if not addr.get("pincode"):
        fail("The order has no delivery address with a pincode.")
    if live():
        lines = all_(conn, """select p.name, p.sku, p.hsn_code, l.quantity, l.unit_price_paise from order_lines l
                              join products p on p.id = l.product_id where l.order_id = :id""", id=o["id"])
        try:
            b = _shiprocket_book(o, lines, addr)
        except (httpx.HTTPError, KeyError, ValueError) as e:
            fail(f"Courier booking failed: {str(e)[:200]}")
    else:
        b = {"provider": SIM, "shipment_id": None, "awb": "SIM" + secrets.token_hex(5).upper(), "courier": "Simulated Courier"}
    order_svc.dispatch_order(conn, actor, number, b["courier"], b["awb"])
    run(conn, """update shipments set provider = :p, provider_shipment_id = :s, tracking_status = 'booked'
                 where order_id = :o and delivered_at is null""", p=b["provider"], s=b["shipment_id"], o=o["id"])
    audit(conn, actor, "shipment.booked", "order", o["id"], None, {"provider": b["provider"], "awb": b["awb"], "courier": b["courier"]})
    return {"courier": b["courier"], "awb": b["awb"], "provider": b["provider"]}


def _status(sh, token: str | None) -> str:
    if sh["provider"] == SIM:
        due = sh["dispatched_at"] + timedelta(days=settings().sim_delivery_days)
        return "delivered" if datetime.now(timezone.utc) >= due else "in_transit"
    r = httpx.get(f"{API}/courier/track/awb/{sh['tracking_number']}", headers={"Authorization": f"Bearer {token}"}, timeout=15)
    r.raise_for_status()
    td = r.json().get("tracking_data", {})
    current = str((td.get("shipment_track") or [{}])[0].get("current_status") or td.get("shipment_status") or "").lower()
    if "delivered" in current and "un" not in current:
        return "delivered"
    if "rto" in current or "return" in current:
        return "returning"
    return "in_transit" if current else "booked"


def poll_tracking(limit: int = 100) -> dict:
    """Cron: refresh courier status; when every courier shipment of an order is delivered, mark the order delivered."""
    with engine().begin() as conn:
        actor = system_actor(conn)
        rows = all_(conn, """select sh.id, sh.provider, sh.tracking_number, sh.dispatched_at, o.number
                             from shipments sh join orders o on o.id = sh.order_id
                             where sh.provider is not null and sh.delivered_at is null and o.status = 'dispatched'
                             order by sh.tracking_checked_at nulls first limit :l""", l=limit)
    token = None
    if any(r["provider"] != SIM for r in rows) and live():
        try:
            token = _token()
        except httpx.HTTPError:
            rows = [r for r in rows if r["provider"] == SIM]
    checked, delivered = 0, []
    for sh in rows:
        try:
            st = _status(sh, token)
        except (httpx.HTTPError, KeyError, ValueError):
            continue
        checked += 1
        with engine().begin() as conn:
            run(conn, "update shipments set tracking_status = :s, tracking_checked_at = now() where id = :id", s=st, id=sh["id"])
            if st == "delivered":
                pending = one(conn, """select count(*)::int as n from shipments s join orders o on o.id = s.order_id
                                       where o.number = :n and s.id <> :id and coalesce(s.tracking_status, '') <> 'delivered'""",
                              n=sh["number"], id=sh["id"])["n"]
                if not pending:
                    order_svc.mark_delivered(conn, actor, sh["number"], f"Courier confirmed delivery · AWB {sh['tracking_number']}")
                    delivered.append(sh["number"])
    return {"checked": checked, "delivered": delivered}
