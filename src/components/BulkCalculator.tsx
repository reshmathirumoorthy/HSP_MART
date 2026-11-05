"use client";

import { useId, useMemo, useState } from "react";
import { useRfp } from "@/context/RfpContext";
import styles from "./BulkCalculator.module.css";

const categories = [
  { label: "Executive Welcome Box (Base ₹1,200/unit)", value: 1200 },
  { label: "Custom Embossed Leather Planner (Base ₹850/unit)", value: 850 },
  { label: "Luxury Premium Metal Pen Set (Base ₹2,100/unit)", value: 2100 },
  { label: "Deluxe Festival Gift Hamper (Base ₹3,500/unit)", value: 3500 },
];

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function BulkCalculator() {
  const { addItem } = useRfp();
  const [base, setBase] = useState(1200);
  const [qty, setQty] = useState(250);
  const [logo, setLogo] = useState(true);
  const [packaging, setPackaging] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const qtyId = useId();
  const statusId = useId();

  const calc = useMemo(() => {
    let discount = 0.05;
    let badge = "5% Bulk Discount";
    let lead = "3-5 Days";
    if (qty >= 250 && qty < 500) {
      discount = 0.15;
      badge = "15% Enterprise Tier";
      lead = "5-7 Days";
    } else if (qty >= 500 && qty < 1000) {
      discount = 0.22;
      badge = "22% Corporate Tier";
      lead = "7-10 Days";
    } else if (qty >= 1000) {
      discount = 0.3;
      badge = "30% Wholesale Tier";
      lead = "10-14 Days";
    }
    let addOns = 0;
    if (logo && qty < 500) addOns += 45;
    if (packaging) addOns += 65;
    const unit = Math.round(base * (1 - discount) + addOns);
    return { badge, lead, unit, total: unit * qty };
  }, [base, qty, logo, packaging]);

  const categoryLabel =
    categories.find((c) => c.value === base)?.label.split("(")[0].trim() ??
    "Bulk estimate";

  return (
    <section
      id="bulk-calculator"
      className={styles.section}
      data-nav-surface="light"
      aria-labelledby="calc-heading"
    >
      <div className="shell">
        <div className={styles.card}>
          <div className={styles.grid}>
            <div className={styles.inputs}>
              <div>
                <span className={styles.eyebrow}>Enterprise Instant Estimator</span>
                <h2 id="calc-heading" className={styles.title}>
                  Interactive B2B Bulk Volume Calculator
                </h2>
                <p className={styles.lead}>
                  Select your order volume to immediately see tiered enterprise
                  discounts &amp; customization options.
                </p>
              </div>

              <label className={styles.field}>
                <span>Select Gift Category</span>
                <select
                  value={base}
                  onChange={(e) => setBase(Number(e.target.value))}
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.field}>
                <div className={styles.qtyRow}>
                  <label htmlFor={qtyId}>Quantity (Units)</label>
                  <span className={styles.qtyBadge} aria-live="polite">
                    {qty} Units
                  </span>
                </div>
                <input
                  id={qtyId}
                  type="range"
                  min={50}
                  max={2500}
                  step={50}
                  value={qty}
                  aria-valuemin={50}
                  aria-valuemax={2500}
                  aria-valuenow={qty}
                  aria-valuetext={`${qty} units`}
                  onChange={(e) => {
                    setQty(Number(e.target.value));
                    setStatus(null);
                  }}
                />
                <div className={styles.rangeLabels} aria-hidden>
                  <span>50 Units</span>
                  <span>500</span>
                  <span>1,000</span>
                  <span>2,500+ Units</span>
                </div>
              </div>

              <div className={styles.toggles}>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={logo}
                    onChange={(e) => setLogo(e.target.checked)}
                  />
                  <span>
                    <strong>Custom Logo Engraving</strong>
                    <em>+ ₹45/unit (Free over 500 units)</em>
                  </span>
                </label>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={packaging}
                    onChange={(e) => setPackaging(e.target.checked)}
                  />
                  <span>
                    <strong>Custom Ribbon &amp; Packaging</strong>
                    <em>+ ₹65/unit</em>
                  </span>
                </label>
              </div>
            </div>

            <aside className={styles.summary}>
              <div className={styles.summaryTop}>
                <span>Applied Discount Tier</span>
                <span className={styles.badge}>{calc.badge}</span>
              </div>
              <dl className={styles.rows}>
                <div>
                  <dt>Base Rate / Unit:</dt>
                  <dd>{inr(base)}</dd>
                </div>
                <div>
                  <dt>Discounted Rate / Unit:</dt>
                  <dd className={styles.strong}>{inr(calc.unit)}</dd>
                </div>
                <div>
                  <dt>Estimated Lead Time:</dt>
                  <dd className={styles.amber}>{calc.lead}</dd>
                </div>
              </dl>
              <div className={styles.totalBlock}>
                <span>Estimated Total Investment</span>
                <p className={styles.total}>{inr(calc.total)}</p>
                <p className={styles.note}>
                  *Excl. GST &amp; Delivery. GST Credit invoice provided. Estimate
                  only — final pricing via formal quote.
                </p>
              </div>
              {status ? (
                <p id={statusId} className={styles.status} role="status">
                  {status}
                </p>
              ) : null}
              <button
                type="button"
                className={styles.cta}
                aria-describedby={status ? statusId : undefined}
                onClick={() => {
                  addItem({ name: categoryLabel, price: calc.unit, qty });
                  setStatus(
                    "Estimate added to your RFP list. Review it in the proposal drawer.",
                  );
                }}
              >
                Lock Proposal &amp; Add to RFP
              </button>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
