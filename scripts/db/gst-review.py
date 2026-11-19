"""Assign HSN codes where the product category makes them unambiguous, and write docs/compliance/gst-review.csv:
one row per product with current rate, proposed HSN/rate, confidence and what the CA must confirm.
Never changes gst_rate_bps; rates change only after the CA signs off (admin app → Products).
Usage: npm run db:gst-review  (uses DATABASE_URL from .env.local; idempotent)"""
import csv
import os
import sys
from pathlib import Path
import psycopg

OUT = Path(__file__).resolve().parents[2] / "docs" / "compliance" / "gst-review.csv"

# (category, subcategory) -> (HSN, proposed rate %, confidence, note)
RULES = {
    ("stationery", "Notebooks"): ("4820", 0, "medium", "Notebooks/exercise books: nil under the Sep-2025 rate changes — confirm before changing from 18%."),
    ("stationery", "Notes"): ("4820", 18, "medium", "Note pads/sticky notes: 4820 other than exercise books, 18% — confirm."),
    ("stationery", "Pads"): ("4820", 18, "medium", "Writing pads: 4820, 18% — confirm."),
    ("writing", "Pens"): ("9608", 18, "high", "Ball/gel pens 9608."),
    ("writing", "Markers"): ("9608", 18, "high", "Markers/felt-tip 9608."),
    ("writing", "Pencils"): ("9609", 0, "medium", "Pencils: nil under the Sep-2025 rate changes — confirm before changing from 18%."),
    ("presentation", "Whiteboards"): ("9610", 18, "medium", "Boards with writing surface 9610 — confirm rate."),
    ("presentation", "Chalk Boards"): ("9610", 18, "medium", "Boards with writing surface 9610 — confirm rate."),
    ("presentation", "Notice & Pin-up Boards"): ("9610", 18, "low", "Could be 9610 or 4421/3926 by material — confirm."),
    ("presentation", "Folders"): ("4820", 18, "high", "Folders/file covers 4820."),
    ("office", "Folders"): ("4820", 18, "high", "Folders/file covers 4820."),
    ("presentation", "Portfolios"): ("4820", 18, "medium", "Presentation portfolios 4820 if paperboard; 4202 if leather — confirm."),
}
REVIEW = ("", None, "review", "Depends on contents/material (food, metal, textile, electronics, wood). CA to classify per item.")

url = sys.argv[1] if len(sys.argv) > 1 else os.environ["DATABASE_URL"]
with psycopg.connect(url) as conn:
    rows = conn.execute("""select id, sku, name, category_slug, subcategory, gst_rate_bps, hsn_code
                           from products order by category_slug, subcategory, sku""").fetchall()
    assigned = 0
    with open(OUT, "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["sku", "name", "category", "subcategory", "current_rate_%", "current_hsn", "proposed_hsn",
                    "proposed_rate_%", "confidence", "ca_to_confirm", "ca_decision", "ca_initials"])
        for pid, sku, name, cat, sub, bps, hsn in rows:
            p_hsn, p_rate, conf, note = RULES.get((cat, sub), REVIEW)
            if p_hsn and not hsn:
                conn.execute("update products set hsn_code = %s where id = %s", (p_hsn, pid))
                assigned += 1
            w.writerow([sku, name, cat, sub, bps / 100, hsn or (p_hsn or ""), p_hsn, "" if p_rate is None else p_rate,
                        conf, note, "", ""])
print(f"{len(rows)} products reviewed, {assigned} HSN codes assigned → docs/compliance/gst-review.csv")
