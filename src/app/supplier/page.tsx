import type { Metadata } from "next";
import { api, getOrNull } from "@/lib/api";
import { PortalShell } from "@/components/portal/PortalShell";
import { Badge, btnGhostCls, Card, Flash, inputCls } from "@/components/portal/ui";
import { requireRole } from "@/lib/auth/dal";
import { formatINR } from "@/lib/commerce/pricing";
import { acknowledgeAction, grievanceResponseAction, stockAction } from "./actions";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = { title: "Supplier portal", robots: { index: false } };

export default async function SupplierHome({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  await loadSiteData();
  const user = await requireRole(["supplier"], "/supplier");
  const flash = await searchParams;
  const data = await api.get<{
    supplier: { id: string; name: string; status: string; city: string | null } | null;
    purchaseOrders: { id: string; number: string; status: string; totalCostPaise: number; createdAt: Date; orderNumber: string }[];
    rates: { id: string; sku: string; name: string; costPaise: number; leadTimeDays: number; stockQuantity: number | null }[];
    grievances: { number: string; category: string; description: string; status: string; supplierNote: string | null; dueAt: string; poNumber: string }[];
  }>("/supplier/dashboard");
  const supplier = data.supplier;
  if (!supplier) {
    return (
      <PortalShell title="Supplier portal" user={user} nav={[]}>
        <p>No supplier account is linked to this login yet. Contact HSP procurement.</p>
      </PortalShell>
    );
  }
  // Suppliers see their own POs and rates only — never selling prices or customers.
  const pos = data.purchaseOrders.map((po) => ({ po, order: po.orderNumber }));
  const rates = data.rates.map((r) => ({ r, sku: r.sku, name: r.name }));

  return (
    <PortalShell title={`Supplier portal · ${supplier.name}`} user={user} nav={[]}>
      <Flash {...flash} />
      <p className="mb-4 text-sm">
        Status: <Badge tone={supplier.status === "approved" ? "good" : "warn"}>{supplier.status}</Badge>
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Purchase orders">
          <ul data-testid="supplier-pos" className="divide-y divide-[var(--color-border)] text-sm">
            {pos.map(({ po }) => (
              <li key={po.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  {po.number} · {formatINR(po.totalCostPaise)} <Badge>{po.status}</Badge>
                </span>
                {po.status === "issued" && (
                  <form action={acknowledgeAction.bind(null, po.id)}>
                    <button className={btnGhostCls}>Acknowledge</button>
                  </form>
                )}
              </li>
            ))}
            {pos.length === 0 && <li className="py-3 text-[var(--color-text-muted)]">No purchase orders yet.</li>}
          </ul>
        </Card>
        <Card title="Your products & stock">
          <ul className="divide-y divide-[var(--color-border)] text-sm">
            {rates.map(({ r, sku, name }) => (
              <li key={r.id} className="py-2">
                <p>
                  {name} <span className="text-xs text-[var(--color-text-muted)]">{sku}</span>
                </p>
                <form action={stockAction.bind(null, r.id)} className="mt-1 flex gap-2">
                  <input
                    name="stock"
                    aria-label={`Stock for ${sku}`}
                    defaultValue={r.stockQuantity ?? ""}
                    inputMode="numeric"
                    className={`${inputCls} max-w-28`}
                  />
                  <button className={btnGhostCls}>Update stock</button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
        <div className="md:col-span-2">
          <Card title="Quality complaints">
            <ul data-testid="supplier-grievances" className="divide-y divide-[var(--color-border)] text-sm">
              {data.grievances.map((g) => (
                <li key={g.number} className="py-2">
                  <p>
                    {g.number} · {g.poNumber} · {g.category.replaceAll("_", " ")} <Badge tone={g.status === "with_supplier" ? "warn" : "neutral"}>{g.status.replaceAll("_", " ")}</Badge>
                  </p>
                  <p className="text-[var(--color-text-muted)]">{g.description}</p>
                  {g.supplierNote && <p className="text-xs">Your response: {g.supplierNote}</p>}
                  {g.status === "with_supplier" && (
                    <form action={grievanceResponseAction.bind(null, g.number)} className="mt-2 flex gap-2">
                      <input name="note" aria-label={`Response to ${g.number}`} placeholder="Corrective action taken" className={inputCls} />
                      <button className={btnGhostCls}>Send response</button>
                    </form>
                  )}
                </li>
              ))}
              {data.grievances.length === 0 && <li className="py-3 text-[var(--color-text-muted)]">No complaints. Keep it up.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
