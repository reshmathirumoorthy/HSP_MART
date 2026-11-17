import type { ReactNode } from "react";

export const ADMIN_NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/quotes", label: "Quotes" },
  { href: "/admin/assistant", label: "AI assistant" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/suppliers", label: "Suppliers" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/insights", label: "Insights" },
  { href: "/admin/programmes", label: "Programmes" },
];

export const inputCls =
  "w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]";
export const btnCls =
  "rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]";
export const btnGhostCls =
  "rounded-md border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-accent-soft)]";

export function Flash({ error, ok }: { error?: string; ok?: string }) {
  if (!error && !ok) return null;
  return error ? (
    <p data-testid="flash-error" role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
      {error}
    </p>
  ) : (
    <p data-testid="flash-ok" role="status" className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-900">
      {ok}
    </p>
  );
}

export function Badge({ children, tone = "neutral", testId }: { children: ReactNode; tone?: "neutral" | "warn" | "good"; testId?: string }) {
  const tones = {
    neutral: "bg-[var(--color-ivory-deep)] text-[var(--color-text)]",
    warn: "bg-amber-100 text-amber-900",
    good: "bg-green-100 text-green-900",
  };
  return (
    <span data-testid={testId} className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-white p-5">
      {title && <h2 className="mb-3 font-medium">{title}</h2>}
      {children}
    </section>
  );
}

export function Row({ label, value, testId }: { label: string; value: ReactNode; testId?: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <dt className="text-[var(--color-text-secondary)]">{label}</dt>
      <dd data-testid={testId} className="tabular-nums">
        {value}
      </dd>
    </div>
  );
}
