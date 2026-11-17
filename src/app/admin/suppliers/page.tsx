import { api, getOrNull } from "@/lib/api";
import { PortalShell } from "@/components/portal/PortalShell";
import { ADMIN_NAV, Badge, btnCls, btnGhostCls, Card, Flash, inputCls } from "@/components/portal/ui";
import { requireRole } from "@/lib/auth/dal";
import { STAFF_ROLES } from "@/lib/auth/token";
import { formatINR } from "@/lib/commerce/pricing";
import { createSupplierAction, supplierRateAction, supplierStatusAction } from "../actions";
import { loadSiteData } from "@/lib/siteData.server";

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  await loadSiteData();
  const user = await requireRole(STAFF_ROLES, "/admin/suppliers");
  const flash = await searchParams;
  type Rate = { id: string; supplierId: string; sku: string; name: string; costPaise: number; leadTimeDays: number; stockQuantity: number | null };
  const data = await api.get<({ id: string; name: string; city: string | null; gstin: string | null; status: string; loginEmail: string | null; createdAt: Date; rates: Rate[] })[]>("/admin/suppliers");
  const suppliers = data;
  const rates = data.flatMap((s) => s.rates.map((r) => ({ r, sku: r.sku })));

  return (
    <PortalShell title="Approved suppliers" user={user} nav={ADMIN_NAV}>
      <Flash {...flash} />
      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <Card title="Add supplier">
          <form action={createSupplierAction} className="space-y-3">
            <input name="name" placeholder="Supplier name" aria-label="Supplier name" className={inputCls} />
            <input name="city" placeholder="City" aria-label="City" className={inputCls} />
            <input name="gstin" placeholder="GSTIN" aria-label="GSTIN" className={inputCls} />
            <input name="loginEmail" placeholder="Supplier portal login email (optional)" aria-label="Supplier login email" className={inputCls} />
            <button className={btnCls}>Add (pending approval)</button>
          </form>
        </Card>
        <div className="space-y-4">
          {suppliers.map((s) => (
            <Card key={s.id}>
              <div data-testid={`supplier-${s.name}`} className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium">
                  {s.name} <span className="text-sm text-[var(--color-text-muted)]">{s.city}</span>{" "}
                  <Badge tone={s.status === "approved" ? "good" : "warn"}>{s.status}</Badge>
                </p>
                <div className="flex gap-2">
                  {s.status !== "approved" && (
                    <form action={supplierStatusAction.bind(null, s.id, "approved")}>
                      <button className={btnGhostCls}>Approve</button>
                    </form>
                  )}
                  {s.status === "approved" && (
                    <form action={supplierStatusAction.bind(null, s.id, "suspended")}>
                      <button className={btnGhostCls}>Suspend</button>
                    </form>
                  )}
                </div>
              </div>
              <ul className="my-2 text-xs">
                {rates
                  .filter(({ r }) => r.supplierId === s.id)
                  .map(({ r, sku }) => (
                    <li key={r.id}>
                      {sku} · {formatINR(r.costPaise)} · {r.leadTimeDays}d
                    </li>
                  ))}
              </ul>
              <form action={supplierRateAction.bind(null, s.id)} className="flex flex-wrap gap-2">
                <input name="sku" placeholder="SKU" aria-label="Rate SKU" className={`${inputCls} max-w-48`} />
                <input name="cost" placeholder="Cost ₹" aria-label="Rate cost" className={`${inputCls} max-w-28`} />
                <input name="leadTime" placeholder="Days" aria-label="Lead time" className={`${inputCls} max-w-20`} />
                <button className={btnGhostCls}>Save rate</button>
              </form>
            </Card>
          ))}
        </div>
      </div>
    </PortalShell>
  );
}
