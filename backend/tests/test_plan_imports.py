import uuid
from conftest import login, make_user, sql
from app.services.plan import BASE, compute


def test_default_plan_reproduces_the_blueprint():
    p = compute(BASE)["years"]
    assert [y["revenue"] for y in p] == [297.3, 1692.0, 6480.0]
    assert [y["contribution"] for y in p] == [49.35, 236.52, 849.6]
    assert [y["ebitda"] for y in p] == [-30.65, 76.52, 529.6]
    assert [y["cash"] for y in p] == [-70.31, 22.87, 456.39]
    assert [y["associateMonthlyCommission"] for y in p] == [1875, 3000, 4200]
    assert round(p[0]["breakEvenRevenue"] / 100, 2) == 4.82  # ₹ crore
    ch = {c["channel"]: c["contributionPct"] for c in compute(BASE)["channels"]}
    assert ch == {"associate": 13.0, "franchise": 11.0, "direct": 23.0}


def test_plan_edit_is_finance_only_validated_and_audited(admin):
    fin = login(make_user("hsp_finance"))
    proc = login(make_user("hsp_procurement"))
    d = fin.get("/api/admin/plan").json()
    a = d["assumptions"]
    a["years"][0]["associates"] = 100
    assert proc.post("/api/admin/plan", json={"assumptions": a}).status_code == 403
    bad = {**a, "procurementPct": 95, "fulfilmentPct": 7}
    assert fin.post("/api/admin/plan", json={"assumptions": bad}).status_code == 400
    r = fin.post("/api/admin/plan", json={"assumptions": a})
    assert r.status_code == 200 and r.json()["plan"]["years"][0]["associateSales"] == 225.0
    assert sql("select count(*)::int as n from audit_events where action = 'plan.update'")["n"] >= 1
    assert fin.post("/api/admin/plan/reset").json()["isDefault"] is True


def _csv(rows):
    return "\n".join(",".join(r) for r in rows).encode()


def test_product_cost_import_dry_run_then_apply(admin):
    bad = _csv([["sku", "landed_cost_rupees", "selling_price_rupees"], ["NOPE-1", "10", ""], ["HSP-STN-001", "abc", ""]])
    r = admin.post("/api/admin/imports/product_costs", files={"file": ("c.csv", bad)}).json()
    assert r["errorCount"] == 2 and not r["applied"]
    good = _csv([["sku", "landed_cost_rupees", "selling_price_rupees"], ["HSP-STN-001", "123.45", ""]])
    r = admin.post("/api/admin/imports/product_costs", files={"file": ("c.csv", good)}).json()
    assert r["valid"] == 1 and not r["applied"]
    r = admin.post("/api/admin/imports/product_costs", files={"file": ("c.csv", good)}, data={"apply": "true"}).json()
    assert r["applied"]
    assert sql("select cost_paise from products where sku = 'HSP-STN-001'")["cost_paise"] == 12345


def test_supplier_import_creates_pending_supplier_with_rates(admin):
    name = f"Import Supplier {uuid.uuid4().hex[:6]}"
    f = _csv([["supplier_name", "city", "gstin", "login_email", "sku", "cost_rupees", "lead_time_days", "stock_quantity"],
              [name, "Pune", "", "", "HSP-STN-001", "99", "4", "250"]])
    r = admin.post("/api/admin/imports/suppliers", files={"file": ("s.csv", f)}, data={"apply": "true"}).json()
    assert r["applied"], r
    row = sql("""select s.status::text as status, r.cost_paise, r.lead_time_days, r.stock_quantity from suppliers s
                 join supplier_rates r on r.supplier_id = s.id where s.name = :n""", n=name)
    assert dict(row) == {"status": "pending", "cost_paise": 9900, "lead_time_days": 4, "stock_quantity": 250}


def test_sales_history_import_is_idempotent_and_shows_in_actuals():
    fin = login(make_user("hsp_finance"))
    f = _csv([["month", "channel", "division", "orders", "revenue_rupees", "cost_rupees"],
              ["2025-11", "direct", "", "4", "100000", "70000"]])
    for _ in range(2):
        assert fin.post("/api/admin/imports/sales_history", files={"file": ("h.csv", f)}, data={"apply": "true"}).json()["applied"]
    assert sql("select count(*)::int as n from sales_history where month = '2025-11' and channel = 'direct'")["n"] == 1
    hist = {h["channel"]: h for h in fin.get("/api/admin/plan").json()["actuals"]["history"]}
    assert hist["direct"]["grossMarginPct"] == 30.0


def test_gst_decisions_apply_only_signed_rows(admin):
    fin = login(make_user("hsp_finance"))
    before = sql("select gst_rate_bps from products where sku = 'HSP-STN-002'")
    f = _csv([["sku", "proposed_hsn", "ca_decision", "ca_initials"], ["HSP-STN-001", "4820", "5", "RK"], ["HSP-STN-002", "4820", "0", ""]])
    r = fin.post("/api/admin/imports/gst_decisions", files={"file": ("g.csv", f)}, data={"apply": "true"}).json()
    assert r["applied"] and r["skipped"] == 1
    assert sql("select gst_rate_bps, hsn_code from products where sku = 'HSP-STN-001'") == {"gst_rate_bps": 500, "hsn_code": "4820"}
    assert sql("select gst_rate_bps from products where sku = 'HSP-STN-002'") == before
    bad = _csv([["sku", "proposed_hsn", "ca_decision", "ca_initials"], ["HSP-STN-001", "4820", "7", "RK"]])
    assert fin.post("/api/admin/imports/gst_decisions", files={"file": ("g.csv", bad)}).json()["errorCount"] == 1
    sql("update products set gst_rate_bps = 1800 where sku = 'HSP-STN-001'")


def test_readiness_reports_every_condition(admin):
    d = admin.get("/api/admin/readiness").json()
    assert d["total"] == 7 and {c["status"] for c in d["checks"]} <= {"pass", "fail", "no_data"}
