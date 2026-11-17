"""Catalogue & site content: the storefront's single source, edited only through the admin API."""
import uuid
from conftest import login, make_user, sql

ONLINE = "cable-organizer-01"


def test_site_data_is_public_and_complete(anon):
    d = anon.get("/api/site-data").json()
    assert len(d["products"]) > 100 and d["version"]
    assert set(d["content"]) >= {"company", "faqs", "categories", "announcement", "navigation", "home", "about", "commerce"}
    p = next(x for x in d["products"] if x["id"] == ONLINE)
    assert {"price", "images", "stockStatus", "minOrderQuantity", "description"} <= set(p)
    assert "costPaise" not in p and "cost_paise" not in p  # cost never leaves the admin API


def test_price_edit_reaches_storefront_and_checkout():
    admin = login(make_user("hsp_admin"))
    before = admin.get(f"/api/admin/products/{ONLINE}").json()
    try:
        assert admin.post(f"/api/admin/products/{ONLINE}", json={"pricePaise": 54321}).status_code == 200
        d = admin.get("/api/site-data").json()
        assert next(x for x in d["products"] if x["id"] == ONLINE)["price"] == 543.21
        email = make_user("customer")
        c = login(email)
        n = c.post("/api/checkout", json={"clientRef": f"py{uuid.uuid4().hex[:12]}", "customer": {"fullName": "K", "email": email, "phone": "9876543210"},
                                          "address": {"line1": "1", "city": "Pune", "state": "MH", "pincode": "411001"},
                                          "items": [{"productId": ONLINE, "quantity": 1}]}).json()["orderNumber"]
        assert sql("select subtotal_paise from orders where number = :n", n=n)["subtotal_paise"] == 54321
        ev = sql("select before, after from audit_events where entity = 'product' and entity_id = :i order by created_at desc limit 1", i=ONLINE)
        assert ev["after"]["price_paise"] == 54321
    finally:
        admin.post(f"/api/admin/products/{ONLINE}", json={"pricePaise": before["pricePaise"]})


def test_product_rules_and_roles():
    admin, proc, fin = login(make_user("hsp_admin")), login(make_user("hsp_procurement")), login(make_user("hsp_finance"))
    assert fin.post(f"/api/admin/products/{ONLINE}", json={"stockStatus": "low_stock"}).status_code == 403
    assert proc.post(f"/api/admin/products/{ONLINE}", json={"stockStatus": "nope"}).json()["detail"] == "Unknown stock status."
    r = proc.post(f"/api/admin/products/{ONLINE}", json={"content": {"images": ["javascript:alert(1)"]}})
    assert r.status_code == 400 and "Images" in r.json()["detail"]
    assert proc.post(f"/api/admin/products/{ONLINE}", json={"gstRateBps": 1700}).status_code == 400
    slug = f"py-test-{uuid.uuid4().hex[:6]}"
    body = {"id": slug, "name": "Py Test Mug", "sku": slug.upper(), "slug": slug, "categorySlug": "gifts", "pricePaise": 29900,
            "content": {"shortDescription": "Mug", "images": ["/images/products/x.jpg"]}}
    assert admin.post("/api/admin/products", json={**body, "categorySlug": "nope"}).json()["detail"] == "Choose a category."
    assert admin.post("/api/admin/products", json=body).json() == {"id": slug}
    assert admin.post("/api/admin/products", json=body).status_code == 400  # duplicate
    created = admin.get(f"/api/admin/products/{slug}").json()
    assert created["active"] is False and created["content"]["shortDescription"] == "Mug"  # new products start hidden
    page = admin.get(f"/api/admin/products?q={slug}").json()
    assert page["total"] == 1 and page["items"][0]["image"] == "/images/products/x.jpg"


def test_content_validation_roles_and_audit():
    admin, proc = login(make_user("hsp_admin")), login(make_user("hsp_procurement"))
    original = admin.get("/api/admin/content").json()["content"]["announcement"]
    assert proc.post("/api/admin/content/announcement", json={"value": original}).status_code == 403
    assert admin.post("/api/admin/content/nope", json={"value": {}}).json()["detail"] == "Unknown content block."
    assert admin.post("/api/admin/content/announcement", json={"value": {"messages": "x"}}).status_code == 400
    bad_nav = admin.get("/api/admin/content").json()["content"]["navigation"]
    bad_nav["primary"].append({"label": "Evil", "href": "javascript:alert(1)"})
    assert "site path" in admin.post("/api/admin/content/navigation", json={"value": bad_nav}).json()["detail"]
    cats = admin.get("/api/admin/content").json()["content"]["categories"]
    r = admin.post("/api/admin/content/categories", json={"value": [c for c in cats if c["slug"] != "gifts"]})
    assert r.status_code == 400 and "gifts" in r.json()["detail"]
    home = admin.get("/api/admin/content").json()["content"]["home"]
    home["hampers"]["productIds"] = ["no-such-product"]
    assert "Unknown product id" in admin.post("/api/admin/content/home", json={"value": home}).json()["detail"]
    try:
        new = {"messages": ["Diwali orders close on 20 Oct", "Free delivery on orders above {freeShippingThreshold}"], "showPhone": False}
        assert admin.post("/api/admin/content/announcement", json={"value": new}).status_code == 200
        assert admin.get("/api/site-data").json()["content"]["announcement"] == new
        ev = sql("select after from audit_events where entity = 'site_content' and entity_id = 'announcement' order by created_at desc limit 1")
        assert ev["after"]["value"] == new
    finally:
        admin.post("/api/admin/content/announcement", json={"value": original})
