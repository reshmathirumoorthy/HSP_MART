"""Built hampers at checkout: server re-checks the fit, prices box + contents per line, and sizes the parcel."""
import json
import uuid

import pytest
from conftest import login, make_user, sql

from app.services.courier import parcel

BOX, MUG, BOOK, BARE = "py-hb-box", "py-hb-mug", "py-hb-book", "py-hb-bare"
PHOTO = "/images/products/hans-writing-pad.jpg"
MODEL = {"hamperImage": PHOTO, "model3d": {"kind": "photos", "shape": "box", "faces": {f: PHOTO for f in ("front", "back", "left", "right", "top", "bottom")}}}


@pytest.fixture(scope="module", autouse=True)
def seeded():
    t = sql("select category_slug, division::text as d, budget_band::text as b from products where active limit 1")
    rows = [(BOX, 30000, 250, 200, 120, 250, 2000, "hamper_box", "any"), (MUG, 40000, 100, 100, 90, 400, None, "item", "upright"),
            (BOOK, 25000, 210, 150, 20, 300, None, "item", "any"), (BARE, 10000, 50, 50, 50, 100, None, "item", "any")]
    for i, (pid, price, l, b, h, w, load, kind, ori) in enumerate(rows):
        sql(f"""insert into products (id, sku, slug, name, division, budget_band, category_slug, price_paise, gst_rate_bps, active,
                    length_mm, breadth_mm, height_mm, weight_g, max_load_g, packing_kind, orientation, content)
                values (:id, :sku, :id, :name, '{t['d']}', '{t['b']}', :c, :price, :gst, true, :l, :b, :h, :w, :load, :kind, :ori,
                        cast(:content as json))
                on conflict (id) do update set content = excluded.content returning id""",
            id=pid, sku=f"PY-HB-{i}", name=pid, c=t["category_slug"], price=price, gst=1200 if pid == MUG else 1800,
            l=l, b=b, h=h, w=w, load=load, kind=kind, ori=ori, content=json.dumps({} if pid == BARE else MODEL))
    yield


def _checkout(items):
    email = make_user("customer")
    c = login(email)
    return c.post("/api/checkout", json={"clientRef": f"py{uuid.uuid4().hex[:12]}", "customer": {"fullName": "K", "email": email, "phone": "9876543210"},
                                         "address": {"line1": "1", "city": "Pune", "state": "MH", "pincode": "411001"}, "items": items})


def test_hamper_is_priced_as_box_plus_contents_with_each_gst_rate():
    r = _checkout([{"productId": BOX, "quantity": 2, "hamper": {"contents": [{"productId": BOOK, "quantity": 1}]}}])
    assert r.status_code == 200, r.text
    n = r.json()["orderNumber"]
    lines = {l["product_id"]: l for l in [sql("select product_id, quantity, gst_rate_bps, personalisation from order_lines l join orders o on o.id = l.order_id where o.number = :n and product_id = :p", n=n, p=p) for p in (BOX, BOOK)]}
    assert lines[BOX]["quantity"] == 2 and lines[BOOK]["quantity"] == 2
    assert lines[BOX]["personalisation"]["hamper"]["contents"] == [{"productId": BOOK, "quantity": 1}]
    assert len(lines[BOX]["personalisation"]["hamper"]["placements"]) == 1
    assert sql("select subtotal_paise from orders where number = :n", n=n)["subtotal_paise"] == 2 * (30000 + 25000)


def test_tampered_hamper_is_refused():
    # Mug + notebook cannot share the small box (fixture case mug-and-notebook-do-not-share).
    r = _checkout([{"productId": BOX, "quantity": 1, "hamper": {"contents": [{"productId": MUG, "quantity": 1}, {"productId": BOOK, "quantity": 1}]}}])
    assert r.status_code == 400 and "doesn't fit" in r.json()["detail"]
    r = _checkout([{"productId": BOX, "quantity": 1, "hamper": {"contents": [{"productId": MUG, "quantity": 5}]}}])  # 2 kg + over volume
    assert r.status_code == 400 and "doesn't fit" in r.json()["detail"]
    r = _checkout([{"productId": MUG, "quantity": 1, "hamper": {"contents": [{"productId": BOOK, "quantity": 1}]}}])
    assert r.status_code == 400 and "not a hamper box" in r.json()["detail"]
    r = _checkout([{"productId": BOX, "quantity": 1, "hamper": {"contents": [{"productId": BOX, "quantity": 1}]}}])
    assert r.status_code == 400 and "cannot go in a hamper" in r.json()["detail"]


def test_parcel_bills_the_higher_of_actual_and_volumetric_weight():
    box = {"quantity": 1, "weight_g": 250, "packing_kind": "hamper_box", "length_mm": 250, "breadth_mm": 200, "height_mm": 120}
    p = parcel([box, {"quantity": 2, "weight_g": 300, "packing_kind": "item", "length_mm": 1, "breadth_mm": 1, "height_mm": 1}])
    assert (p["lengthCm"], p["breadthCm"], p["heightCm"]) == (25, 20, 12)
    assert p["actualKg"] == 0.85 and p["volumetricKg"] == 1.2 and p["billedKg"] == 1.2
    heavy = parcel([box, {"quantity": 1, "weight_g": 1700, "packing_kind": "item"}])
    assert heavy["billedKg"] == heavy["actualKg"] == 1.95
    assert parcel([{"quantity": 3, "weight_g": None, "packing_kind": "item"}])["actualKg"] == 1.5  # 0.5 kg default a unit


def test_products_without_a_3d_model_cannot_go_in_a_hamper():
    r = _checkout([{"productId": BOX, "quantity": 1, "hamper": {"contents": [{"productId": BARE, "quantity": 1}]}}])
    assert r.status_code == 400 and "cannot go in a hamper" in r.json()["detail"]


def test_media_upload_readiness_and_public_serving(anon):
    admin = login(make_user("hsp_admin"))
    png = b"\x89PNG\r\n\x1a\n" + b"0" * 64
    r = admin.post(f"/api/admin/products/{BARE}/media", files={"file": ("side.png", png, "image/png")})
    assert r.status_code == 200, r.text
    url = r.json()["url"]
    got = anon.get(url)
    assert got.status_code == 200 and got.content == png and "immutable" in got.headers["cache-control"]
    glb = b"glTF" + b"\x02\x00\x00\x00" + b"0" * 32
    assert admin.post(f"/api/admin/products/{BARE}/media", files={"file": ("m.glb", glb, "model/gltf-binary")}).json()["contentType"] == "model/gltf-binary"
    bad = admin.post(f"/api/admin/products/{BARE}/media", files={"file": ("m.glb", b"not a model", "model/gltf-binary")})
    assert bad.status_code == 400
    assert login(make_user("hsp_finance")).post(f"/api/admin/products/{BARE}/media", files={"file": ("s.png", png, "image/png")}).status_code == 403

    # Missing faces are listed, and a complete model makes the product ready.
    faces = {"front": url, "back": url, "left": url, "right": url}
    assert admin.post(f"/api/admin/products/{BARE}", json={"content": {"model3d": {"kind": "photos", "shape": "box", "faces": faces}}}).status_code == 200
    assert admin.get(f"/api/admin/products/{BARE}").json()["hamperMissing"] == ["2D photo", "top photo", "bottom photo"]
    faces.update(top=url, bottom=url)
    admin.post(f"/api/admin/products/{BARE}", json={"content": {"hamperImage": url, "model3d": {"kind": "photos", "shape": "box", "faces": faces}}})
    assert admin.get(f"/api/admin/products/{BARE}").json()["hamperMissing"] == []
    p = next(x for x in anon.get("/api/site-data").json()["products"] if x["id"] == BARE)
    assert p["hamperReady"] is True and p["model3d"]["shape"] == "box"
    for bad_model in ({"kind": "glb"}, {"kind": "photos", "shape": "blob"}, {"kind": "photos", "shape": "box", "faces": {"side": url}},
                      {"kind": "photos", "shape": "box", "faces": {"top": "javascript:x"}}):
        assert admin.post(f"/api/admin/products/{BARE}", json={"content": {"model3d": bad_model}}).status_code == 400
    admin.post(f"/api/admin/products/{BARE}", json={"content": {}})
