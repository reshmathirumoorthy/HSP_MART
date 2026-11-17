import { PortalShell } from "@/components/portal/PortalShell";
import { ADMIN_NAV, btnCls, Card, Flash, inputCls } from "@/components/portal/ui";
import { requireRole } from "@/lib/auth/dal";
import { createQuoteAction } from "../../actions";
import { loadSiteData } from "@/lib/siteData.server";

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ error?: string; lines?: string }> }) {
  await loadSiteData();
  const user = await requireRole(["hsp_admin"], "/admin/quotes/new");
  const { error, lines } = await searchParams;

  return (
    <PortalShell title="New direct quote" user={user} nav={ADMIN_NAV}>
      <Flash error={error} />
      <form action={createQuoteAction} className="grid gap-6 md:grid-cols-2">
        <Card title="Customer">
          <div className="space-y-3">
            <label className="block text-sm">
              Organisation or name
              <input name="customerName" required className={inputCls} />
            </label>
            <label className="block text-sm">
              Email
              <input name="customerEmail" type="email" required className={inputCls} />
            </label>
            <label className="block text-sm">
              GSTIN (optional)
              <input name="gstin" className={inputCls} />
            </label>
            <label className="block text-sm">
              Type
              <select name="kind" className={inputCls} defaultValue="organisation">
                <option value="organisation">Organisation</option>
                <option value="individual">Individual</option>
              </select>
            </label>
          </div>
        </Card>
        <Card title="Lines">
          <label className="block text-sm">
            One per line: <code>SKU, quantity[, unit price ₹][, branding notes]</code>
            <textarea name="lines" rows={7} required defaultValue={lines} className={`${inputCls} font-mono`} />
          </label>
          <label className="mt-3 block text-sm">
            Freight charged (₹, optional)
            <input name="freight" inputMode="decimal" className={inputCls} />
          </label>
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            Prices default to the catalogue price. The pricing engine computes GST, cost and contribution; quotes under
            the 12% minimum need a finance exception.
          </p>
        </Card>
        <div className="md:col-span-2">
          <button className={btnCls}>Create quote</button>
        </div>
      </form>
    </PortalShell>
  );
}
