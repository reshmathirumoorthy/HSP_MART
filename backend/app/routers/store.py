"""Storefront APIs: checkout, catalogue lookups, AI discovery, enquiries, and the customer account."""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import Connection
from ..auth import CurrentUser, current_user, require_user
from ..db import get_conn, one
from ..errors import fail
from ..services import account, ai, enquiries, online

router = APIRouter(prefix="/api", tags=["storefront"])
OK = {"ok": True}


class CheckoutIn(BaseModel):
    clientRef: str
    customer: dict
    address: dict
    items: list[dict]


@router.post("/checkout")
async def checkout(request: Request, conn: Connection = Depends(get_conn), user: CurrentUser | None = Depends(current_user)):
    raw = await request.body()
    if len(raw) > 200_000:
        fail("Cart is too large. Upload logos after ordering.")
    if not user:
        raise HTTPException(401, "Sign in to place your order.")
    body = CheckoutIn.model_validate_json(raw)
    o = online.place_online_order(conn, user, client_ref=body.clientRef, customer=body.customer, address=body.address, items=body.items)
    return {"orderNumber": o["number"]}


@router.get("/catalogue/{sku}")
def catalogue(sku: str, conn: Connection = Depends(get_conn)):
    """Authoritative price lookup. Cost and margin are never exposed."""
    p = one(conn, """select id, sku, name, division::text as division, budget_band::text as "budgetBand", price_paise as "pricePaise",
                            gst_rate_bps as "gstRateBps", min_order_quantity as "minOrderQuantity"
                     from products where sku = :s and active""", s=sku)
    if not p:
        raise HTTPException(404, "not_found")
    return dict(p)


def _num(v: str | None):
    try:
        n = float(v) if v else 0
    except ValueError:
        return None
    return n if n > 0 else None


@router.get("/ai/discover")
def discover(q: str | None = None, occasion: str | None = None, budget: str | None = None, qty: str | None = None,
             deadline: str | None = None, conn: Connection = Depends(get_conn)):
    res = ai.discover_products(conn, query=q, occasion=occasion, budget_rupees=_num(budget),
                               quantity=int(_num(qty)) if _num(qty) else None, deadline_days=int(_num(deadline)) if _num(deadline) else None)
    return {"results": [{k: v for k, v in r.items() if k != "score"} for r in res]}


@router.post("/enquiries/bulk-quote")
def bulk_quote(body: dict, conn: Connection = Depends(get_conn), user: CurrentUser | None = Depends(current_user)):
    return enquiries.submit_bulk_quote(conn, user, body)


@router.post("/enquiries/contact")
def contact(body: dict, conn: Connection = Depends(get_conn), user: CurrentUser | None = Depends(current_user)):
    return enquiries.submit_contact(conn, user, body)


# ── Account ──

@router.get("/account/summary")
def summary(user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    orders = account.list_orders(conn, user)
    quotes = account.list_quote_requests(conn, user)
    return {"profile": account.get_profile(conn, user), "orders": orders, "quotes": quotes,
            "unread": sum(1 for n in account.list_notifications(conn, user) if not n["read"])}


@router.get("/account/orders")
def orders(user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    return account.list_orders(conn, user)


@router.get("/account/orders/{number}")
def order(number: str, user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    return account.get_order(conn, user, number) or _404("Order not found.")


@router.get("/account/quotes")
def quote_requests(user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    return account.list_quote_requests(conn, user)


@router.get("/account/quotes/{number}")
def quote_request(number: str, user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    return account.get_quote_request(conn, user, number) or _404("Quote request not found.")


def _404(msg):
    raise HTTPException(404, msg)


@router.get("/account/profile")
def profile(user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    return account.get_profile(conn, user)


class ProfileIn(BaseModel):
    fullName: str
    customerType: str = "individual"
    organizationName: str = ""
    gstin: str = ""


@router.post("/account/profile")
def save_profile(body: ProfileIn, user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    account.update_profile(conn, user, full_name=body.fullName, customer_type=body.customerType,
                           organization_name=body.organizationName, gstin=body.gstin)
    return account.get_profile(conn, user)


@router.get("/account/addresses")
def addresses(user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    return account.list_addresses(conn, user)


@router.post("/account/addresses")
def add_address(body: dict, user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    return account.save_address(conn, user, body)


@router.post("/account/addresses/{address_id}")
def edit_address(address_id: str, body: dict, user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    return account.save_address(conn, user, body, address_id)


@router.post("/account/addresses/{address_id}/default")
def default_address(address_id: str, user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    account.set_default_address(conn, user, address_id)
    return account.list_addresses(conn, user)


@router.delete("/account/addresses/{address_id}")
def remove_address(address_id: str, user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    account.delete_address(conn, user, address_id)
    return account.list_addresses(conn, user)


@router.get("/account/wishlist")
def wishlist(user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    return {"productIds": account.list_wishlist(conn, user)}


class WishIn(BaseModel):
    productId: str
    on: bool = True


@router.post("/account/wishlist")
def toggle_wish(body: WishIn, user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    account.set_wishlist(conn, user, body.productId, body.on)
    return {"productIds": account.list_wishlist(conn, user)}


class MergeIn(BaseModel):
    productIds: list[str]


@router.post("/account/wishlist/merge")
def merge_wish(body: MergeIn, user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    account.merge_wishlist(conn, user, body.productIds)
    return {"productIds": account.list_wishlist(conn, user)}


@router.get("/account/notifications")
def notifications(user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    return account.list_notifications(conn, user)


class ReadIn(BaseModel):
    ids: list[str] | None = None


@router.post("/account/notifications/read")
def read(body: ReadIn, user: CurrentUser = Depends(require_user), conn: Connection = Depends(get_conn)):
    account.mark_notifications_read(conn, user, body.ids)
    return account.list_notifications(conn, user)


# ── Catalogue & content (public) ──

@router.get("/site-data")
def get_site_data(conn: Connection = Depends(get_conn)):
    """Products + storefront content for every Next.js page. Prices here are display prices; the
    checkout and quote endpoints always re-price from the database."""
    from ..services.catalogue import CONTENT_KEYS, site_data
    data = site_data(conn)
    missing = [k for k in CONTENT_KEYS if data["content"].get(k) is None]
    if missing:
        # Never let a half-configured store be cached as if it were real.
        raise HTTPException(503, f"Storefront content is not set up ({', '.join(missing)}). Run npm run db:seed.")
    return data
