import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { btnCls, Card, Flash, inputCls } from "@/components/portal/ui";
import { api } from "@/lib/api";
import { applyAction } from "../partner/actions";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = { title: "Become an HSP partner" };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  await loadSiteData();
  const user = await requireUser("/join");
  const flash = await searchParams;
  const { partner, agreementVersion: AGREEMENT_VERSION } = await api.get<{
    partner: { code: string; status: string } | null;
    agreementVersion: string;
  }>("/partner/me");

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 font-serif text-3xl">Become an HSP gifting partner</h1>
      <p className="mb-6 text-[var(--color-text-secondary)]">
        No joining fee and no inventory to buy. Earn 10% on the net value of orders from customers you bring. HSP
        handles pricing, invoicing, payment and delivery. There are no earnings for recruiting other partners.
      </p>
      <Flash {...flash} />
      {partner ? (
        <Card>
          <p data-testid="application-status">
            Application {partner.code}: <strong>{partner.status}</strong>
          </p>
          {partner.status === "active" && (
            <Link href="/partner" className="mt-3 inline-block underline">
              Open partner portal
            </Link>
          )}
        </Card>
      ) : (
        <form action={applyAction}>
          <Card>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                Programme
                <select name="type" className={inputCls}>
                  <option value="associate">Independent Associate (₹0 deposit)</option>
                  <option value="franchise">City Business Franchise (refundable deposit)</option>
                </select>
              </label>
              <label className="text-sm">
                City
                <input name="city" className={inputCls} />
              </label>
              <label className="text-sm">
                State
                <input name="state" className={inputCls} />
              </label>
              <label className="text-sm">
                PAN
                <input name="pan" className={`${inputCls} uppercase`} />
              </label>
              <label className="text-sm">
                Bank IFSC
                <input name="ifsc" className={`${inputCls} uppercase`} />
              </label>
              <label className="text-sm">
                Bank account (last 4 digits)
                <input name="accountLast4" inputMode="numeric" maxLength={4} className={inputCls} />
              </label>
              <label className="text-sm md:col-span-2">
                GSTIN (if registered)
                <input name="gstin" className={`${inputCls} uppercase`} />
              </label>
            </div>
            <label className="mt-4 flex items-start gap-2 text-sm">
              <input type="checkbox" name="agree" className="mt-1" />
              <span>
                I accept the HSP partner agreement ({AGREEMENT_VERSION}): HSP is the seller of record; commission is paid
                on realised, delivered sales after returns; new leads are protected for 90 days.
              </span>
            </label>
            <button className={`${btnCls} mt-4`}>Submit application</button>
          </Card>
        </form>
      )}
    </main>
  );
}
