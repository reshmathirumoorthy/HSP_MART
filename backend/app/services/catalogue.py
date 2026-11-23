"""Storefront catalogue and site content: the single source for every Next.js page.

Products: columns hold the authoritative commercial fields (price, stock, MOQ, status, tax); the
`content` JSON holds presentation (descriptions, images, specifications, variants, customization).
Site content: one JSON document per key, edited in the admin app.
"""
import hashlib
import json
import re
import httpx
from sqlalchemy import Connection
from ..audit import audit
from ..config import settings
from ..db import all_, one, run
from ..errors import fail
from .common import is_uuid  # noqa: F401
from .online import FREE_SHIPPING_THRESHOLD_PAISE, ONLINE_FREIGHT_PAISE

CONTENT_KEYS = ("company", "faqs", "categories", "announcement", "navigation", "home", "about")
STOCK = ("in_stock", "low_stock", "out_of_stock")
# Fields owned by columns; never trusted from the content JSON.
COLUMN_FIELDS = {"id", "slug", "sku", "name", "price", "active", "stockStatus", "minOrderQuantity", "bulkAvailable",
                 "customizable", "categorySlug", "subcategory", "currency", "category"}


def _rupees(paise: int):
    return paise // 100 if paise % 100 == 0 else paise / 100


def product_doc(row: dict, category_names: dict[str, str]) -> dict:
    content = {k: v for k, v in (row["content"] or {}).items() if k not in COLUMN_FIELDS}
    return {
        **content,
        "id": row["id"], "slug": row["slug"], "sku": row["sku"], "name": row["name"],
        "price": _rupees(row["price_paise"]), "currency": "INR",
        "categorySlug": row["category_slug"], "category": category_names.get(row["category_slug"], row["category_slug"]),
        "subcategory": row["subcategory"] or content.get("subcategory"),
        "active": row["active"], "stockStatus": row["stock_status"], "minOrderQuantity": row["min_order_quantity"],
        "bulkAvailable": row["bulk_available"], "customizable": row["customizable"],
        "images": content.get("images") or [], "unit": content.get("unit") or "piece",
        "shortDescription": content.get("shortDescription") or "", "description": content.get("description") or "",
    }


def get_content(conn: Connection) -> dict:
    rows = {r["key"]: r["value"] for r in all_(conn, "select key, value from site_content")}
    content = {k: rows.get(k) for k in CONTENT_KEYS}
    content["commerce"] = {"freeShippingThresholdPaise": FREE_SHIPPING_THRESHOLD_PAISE, "freightPaise": ONLINE_FREIGHT_PAISE}
    return content


def site_data(conn: Connection) -> dict:
    """Everything the storefront renders, with a version that changes on any edit."""
    content = get_content(conn)
    names = {c["slug"]: c["name"] for c in (content.get("categories") or [])}
    rows = [_public(r) for r in all_(conn, "select * from products order by sort_order, name")]
    marker = one(conn, """select greatest((select max(updated_at) from products), (select max(updated_at) from site_content))::text as v,
                                 (select count(*) from products)::text as n""")
    version = hashlib.sha1(f"{marker['v']}|{marker['n']}".encode()).hexdigest()[:16]
    return {"version": version, "products": [product_doc(r, names) for r in rows], "content": content}


# ── Admin: products ──

def list_products(conn: Connection, q: str = "", category: str = "", status: str = "", limit: int = 50, offset: int = 0):
    where, params = ["true"], {"lim": min(max(limit, 1), 200), "off": max(offset, 0)}
    if q.strip():
        where.append("(name ilike :q or sku ilike :q or slug ilike :q or id ilike :q)")
        params["q"] = f"%{q.strip()}%"
    if category:
        where.append("category_slug = :c")
        params["c"] = category
    if status == "active":
        where.append("active")
    elif status == "inactive":
        where.append("not active")
    w = " and ".join(where)
    rows = all_(conn, f"""select id, sku, slug, name, category_slug, subcategory, price_paise, cost_paise, gst_rate_bps, hsn_code,
                                min_order_quantity, active, stock_status, customizable, bulk_available, sort_order,
                                coalesce(content->'images'->>0, '') as image, updated_at
                         from products where {w} order by sort_order, name limit :lim offset :off""", **params)
    total = one(conn, f"select count(*)::int as n from products where {w}", **{k: v for k, v in params.items() if k not in ("lim", "off")})["n"]
    return {"items": rows, "total": total}


def _public(row):
    """Product row without the search embedding (internal, large)."""
    return {k: v for k, v in dict(row).items() if k != "embedding"} if row else row


def get_product(conn: Connection, product_id: str):
    row = one(conn, "select * from products where id = :id", id=product_id) or fail("Product not found.")
    return _public(row)


SLUG_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


def _division_for(category_slug: str, subcategory: str | None, name: str = "") -> str:
    """Same mapping as src/lib/commerce/classify.ts (Blueprint divisions)."""
    sub, nm = (subcategory or "").lower(), name.lower()
    if "festive" in sub or re.search(r"diwali|holi|christmas|eid|rakhi", nm):
        return "festive"
    if "wedding" in sub or "occasion" in sub:
        return "personal"
    if "platter" in sub or re.search(r"hamper|premium|luxury", nm):
        return "premium"
    return "corporate" if "corporate" in sub else "promotional"


def _budget_band(paise: int) -> str:
    r = paise / 100
    return "under_500" if r < 500 else "500_1000" if r < 1000 else "1000_2500" if r < 2500 else "2500_5000" if r < 5000 else "5000_plus"


def _validate(data: dict, categories: set[str], creating: bool) -> dict:
    out = {}
    if creating or "name" in data:
        name = str(data.get("name") or "").strip()
        if not 2 <= len(name) <= 200:
            fail("Enter a product name (2–200 characters).")
        out["name"] = name
    if creating or "sku" in data:
        sku = str(data.get("sku") or "").strip().upper()
        if not re.fullmatch(r"[A-Z0-9][A-Z0-9-]{1,40}", sku):
            fail("SKU must be letters, numbers and dashes.")
        out["sku"] = sku
    if creating or "slug" in data:
        slug = str(data.get("slug") or "").strip().lower()
        if not SLUG_RE.fullmatch(slug) or len(slug) > 160:
            fail("Slug must be lowercase words joined by dashes.")
        out["slug"] = slug
    if creating or "categorySlug" in data:
        c = str(data.get("categorySlug") or "")
        if c not in categories:
            fail("Choose a category.")
        out["category_slug"] = c
    if "subcategory" in data:
        out["subcategory"] = str(data.get("subcategory") or "").strip() or None
    if creating or "pricePaise" in data:
        p = data.get("pricePaise")
        if not isinstance(p, int) or isinstance(p, bool) or p < 0 or p > 100_000_000:
            fail("Enter a valid price.")
        out["price_paise"] = p
    if "costPaise" in data:
        c = data.get("costPaise")
        if c is not None and (not isinstance(c, int) or c < 0):
            fail("Enter a valid cost.")
        out["cost_paise"] = c
    if "gstRateBps" in data:
        g = data.get("gstRateBps")
        if g not in (0, 500, 1200, 1800, 2800):
            fail("GST rate must be 0, 5, 12, 18 or 28%.")
        out["gst_rate_bps"] = g
    if "hsnCode" in data:
        h = str(data.get("hsnCode") or "").strip()
        if h and not re.fullmatch(r"\d{4,8}", h):
            fail("HSN code must be 4–8 digits.")
        out["hsn_code"] = h or None
    if "minOrderQuantity" in data:
        m = data.get("minOrderQuantity")
        if not isinstance(m, int) or not 1 <= m <= 100_000:
            fail("Minimum order must be at least 1.")
        out["min_order_quantity"] = m
    if "stockStatus" in data:
        if data["stockStatus"] not in STOCK:
            fail("Unknown stock status.")
        out["stock_status"] = data["stockStatus"]
    for k, col in (("active", "active"), ("customizable", "customizable"), ("bulkAvailable", "bulk_available")):
        if k in data:
            out[col] = bool(data[k])
    if "sortOrder" in data:
        out["sort_order"] = int(data.get("sortOrder") or 0)
    if "content" in data:
        c = data["content"]
        if not isinstance(c, dict):
            fail("Content must be an object.")
        imgs = c.get("images", [])
        if not isinstance(imgs, list) or not all(isinstance(i, str) and (i.startswith("/") or i.startswith("https://")) for i in imgs):
            fail("Images must be site paths (/images/…) or https:// URLs.")
        if len(json.dumps(c)) > 200_000:
            fail("Product content is too large.")
        out["content"] = {k: v for k, v in c.items() if k not in COLUMN_FIELDS}
    return out


def _categories(conn) -> set[str]:
    cats = one(conn, "select value from site_content where key = 'categories'")
    return {c["slug"] for c in (cats["value"] if cats else [])}


def save_product(conn: Connection, actor, data: dict, product_id: str | None = None):
    if actor.role not in ("hsp_admin", "hsp_procurement"):
        fail("Only admin or procurement can edit products.")
    fields = _validate(data, _categories(conn), creating=product_id is None)
    if product_id is None:
        pid = str(data.get("id") or fields["slug"]).strip()
        if not SLUG_RE.fullmatch(pid):
            fail("Product id must be lowercase words joined by dashes.")
        if one(conn, "select 1 as x from products where id = :i or sku = :s or slug = :g", i=pid, s=fields["sku"], g=fields["slug"]):
            fail("A product with that id, SKU or slug already exists.")
        fields.setdefault("content", {})
        row = one(conn, """insert into products (id, sku, slug, name, division, budget_band, category_slug, subcategory, price_paise,
                               cost_paise, gst_rate_bps, hsn_code, customizable, bulk_available, min_order_quantity, active,
                               stock_status, sort_order, content)
                           values (:id, :sku, :slug, :name, :div, :band, :category_slug, :subcategory, :price_paise, :cost_paise,
                                   :gst, :hsn, :cust, :bulk, :moq, :active, :stock, :sort, cast(:content as json)) returning *""",
                  id=pid, sku=fields["sku"], slug=fields["slug"], name=fields["name"],
                  div=_division_for(fields["category_slug"], fields.get("subcategory"), fields["name"]), band=_budget_band(fields["price_paise"]),
                  category_slug=fields["category_slug"], subcategory=fields.get("subcategory"), price_paise=fields["price_paise"],
                  cost_paise=fields.get("cost_paise"), gst=fields.get("gst_rate_bps", 1800), hsn=fields.get("hsn_code"),
                  cust=fields.get("customizable", False), bulk=fields.get("bulk_available", True), moq=fields.get("min_order_quantity", 1),
                  active=fields.get("active", False), stock=fields.get("stock_status", "in_stock"), sort=fields.get("sort_order", 1000),
                  content=json.dumps(fields["content"]))
        audit(conn, actor, "product.create", "product", pid, None, {"sku": row["sku"], "pricePaise": row["price_paise"], "active": row["active"]})
    else:
        before = get_product(conn, product_id)
        if not fields:
            fail("Nothing to change.")
        if "sku" in fields and one(conn, "select 1 as x from products where sku = :s and id <> :i", s=fields["sku"], i=product_id):
            fail("Another product already uses that SKU.")
        if "slug" in fields and one(conn, "select 1 as x from products where slug = :s and id <> :i", s=fields["slug"], i=product_id):
            fail("Another product already uses that slug.")
        if "price_paise" in fields:
            fields["budget_band"] = _budget_band(fields["price_paise"])
        sets = ", ".join(f"{k} = cast(:{k} as json)" if k == "content" else f"{k} = :{k}" for k in fields)
        params = {k: (json.dumps(v) if k == "content" else v) for k, v in fields.items()}
        row = one(conn, f"update products set {sets}, embedding = null, updated_at = now() where id = :pid returning *", pid=product_id, **params)
        changed = {k: v for k, v in fields.items() if k != "content" and before.get(k) != v}
        audit(conn, actor, "product.update", "product", product_id, {k: before.get(k) for k in changed},
              {**changed, **({"content": "updated"} if "content" in fields and before["content"] != fields["content"] else {})})
    request_storefront_refresh(conn)
    return _public(row)


# ── Admin: site content ──

def _links(v, where):
    if not isinstance(v, list) or not all(isinstance(l, dict) and isinstance(l.get("label"), str) and isinstance(l.get("href"), str)
                                          and (l["href"].startswith("/") or l["href"].startswith("https://")) for l in v):
        fail(f"{where}: every link needs a label and a site path (/…) or https:// URL.")


def _strs(d, keys, where):
    for k in keys:
        if not isinstance(d.get(k), str):
            fail(f"{where}: '{k}' must be text.")


def validate_content(key: str, value) -> None:
    if key not in CONTENT_KEYS:
        fail("Unknown content block.")
    if len(json.dumps(value)) > 300_000:
        fail("Content is too large.")
    if key == "company":
        if not isinstance(value, dict):
            fail("Company must be an object.")
        _strs(value, ("companyName", "tagline", "description", "businessType"), "Company")
        if not isinstance(value.get("contact"), dict) or not isinstance(value["contact"].get("website"), str):
            fail("Company: contact.website is required.")
        if not isinstance(value.get("services"), list) or not isinstance(value.get("categories"), list):
            fail("Company: services and categories must be lists.")
    elif key == "faqs":
        if not isinstance(value, list):
            fail("FAQs must be a list.")
        for f in value:
            if not isinstance(f, dict):
                fail("Each FAQ must be an object.")
            _strs(f, ("id", "question", "answer"), "FAQ")
    elif key == "categories":
        if not isinstance(value, list) or not value:
            fail("Add at least one category.")
        slugs = set()
        for c in value:
            if not isinstance(c, dict):
                fail("Each category must be an object.")
            _strs(c, ("id", "slug", "name", "description"), "Category")
            if not SLUG_RE.fullmatch(c["slug"]) or c["slug"] == "all":
                fail(f"Category slug '{c['slug']}' is not valid.")
            slugs.add(c["slug"])
        if len(slugs) != len(value):
            fail("Category slugs must be unique.")
    elif key == "announcement":
        if not isinstance(value, dict) or not isinstance(value.get("messages"), list) or not all(isinstance(m, str) for m in value["messages"]):
            fail("Announcement needs a list of messages.")
        if not isinstance(value.get("showPhone"), bool):
            fail("Announcement: showPhone must be true or false.")
    elif key == "navigation":
        if not isinstance(value, dict):
            fail("Navigation must be an object.")
        for k in ("primary", "gifting", "shopExtras", "explore"):
            _links(value.get(k), f"Navigation {k}")
        foot = value.get("footer")
        if not isinstance(foot, dict):
            fail("Navigation: footer is required.")
        for k in ("shop", "help", "legal"):
            _links(foot.get(k), f"Footer {k}")
    elif key == "home":
        if not isinstance(value, dict):
            fail("Home must be an object.")
        for section in ("hero", "hampers", "trail", "dispatch", "house", "close", "newArrivals"):
            if not isinstance(value.get(section), dict):
                fail(f"Home: '{section}' section is missing.")
        _strs(value["hero"], ("titleBefore", "titleEmphasis", "titleAfter", "lead", "featuredSlug"), "Home hero")
        for section in ("hampers", "dispatch", "house", "newArrivals"):
            ids = value[section].get("productIds")
            if not isinstance(ids, list) or not all(isinstance(i, str) for i in ids):
                fail(f"Home {section}: productIds must be a list of product ids.")
        if not isinstance(value.get("occasions"), list):
            fail("Home: occasions must be a list.")
    elif key == "about":
        if not isinstance(value, dict):
            fail("About must be an object.")
        _strs(value, ("title", "focusTitle", "servicesTitle", "legalTitle"), "About")
        _links(value.get("actions"), "About actions")


def save_content(conn: Connection, actor, key: str, value):
    if actor.role != "hsp_admin":
        fail("Only admin can edit site content.")
    validate_content(key, value)
    if key == "home":
        ids = {pid for s in ("hampers", "dispatch", "house", "newArrivals") for pid in value[s]["productIds"]}
        if ids:
            known = {r["id"] for r in all_(conn, "select id from products where id = any(:ids)", ids=list(ids))}
            missing = sorted(ids - known)
            if missing:
                fail(f"Unknown product id: {', '.join(missing[:5])}")
    if key == "categories":
        in_use = {r["category_slug"] for r in all_(conn, "select distinct category_slug from products")}
        removed = sorted(in_use - {c["slug"] for c in value})
        if removed:
            fail(f"Products still use these categories: {', '.join(removed)}. Move them first.")
    before = one(conn, "select value from site_content where key = :k", k=key)
    run(conn, """insert into site_content (key, value, updated_by, updated_at) values (:k, cast(:v as jsonb), cast(:u as uuid), now())
                 on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()""",
        k=key, v=json.dumps(value), u=actor.id)
    audit(conn, actor, "content.update", "site_content", key, {"value": before["value"]} if before else None, {"value": value})
    request_storefront_refresh(conn)


# ── Storefront cache refresh ──

def _post_refresh():
    s = settings()
    if not s.next_revalidate_url or not s.revalidate_secret:
        return
    try:
        httpx.post(s.next_revalidate_url, headers={"x-revalidate-secret": s.revalidate_secret}, timeout=5)
    except Exception:  # noqa: BLE001 — best effort: the storefront also refreshes on its own every 5 minutes
        pass


def request_storefront_refresh(conn: Connection):
    """After the transaction commits, tell Next.js to drop its cached catalogue/content.

    Runs synchronously inside the commit, which happens before the response is sent (get_conn uses
    scope="function"), so an admin edit is visible on the very next storefront request. A background
    thread here would race that request.
    """
    from sqlalchemy import event

    event.listen(conn, "commit", lambda _conn: _post_refresh(), once=True)
