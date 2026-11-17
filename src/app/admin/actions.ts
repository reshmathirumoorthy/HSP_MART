"use server";

import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { requireRole } from "@/lib/auth/dal";
import { STAFF_ROLES } from "@/lib/auth/token";
import { runAndRedirect, rupeesToPaise, str } from "@/lib/actionResult";

/* Every action authorises optimistically here; the backend re-checks role and business rules. */

export async function createQuoteAction(form: FormData) {
  await requireRole(["hsp_admin"]);
  let number: string;
  try {
    number = (
      await api.post<{ number: string }>("/admin/quotes", {
        customerName: str(form, "customerName"),
        customerEmail: str(form, "customerEmail"),
        kind: str(form, "kind") === "individual" ? "individual" : "organisation",
        gstin: str(form, "gstin"),
        lines: str(form, "lines"),
        freightPaise: rupeesToPaise(form.get("freight")) ?? 0,
      })
    ).number;
  } catch (e) {
    if (e instanceof ApiError) redirect(`/admin/quotes/new?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(`/admin/quotes/${number}?ok=Quote%20created`);
}

export async function approveExceptionAction(number: string, form: FormData) {
  await requireRole(["hsp_admin", "hsp_finance"]);
  await runAndRedirect(`/admin/quotes/${number}`, () => api.post(`/admin/quotes/${number}/approve-exception`, { reason: str(form, "reason") }), "Exception approved");
}

export async function sendQuoteAction(number: string) {
  await requireRole(["hsp_admin"]);
  await runAndRedirect(`/admin/quotes/${number}`, () => api.post(`/admin/quotes/${number}/send`), "Quote sent to customer");
}

export async function orderStepAction(number: string, form: FormData) {
  await requireRole(["hsp_admin", "hsp_procurement"]);
  const body = new FormData();
  for (const k of ["step", "supplierId", "courier", "tracking", "proof"]) body.set(k, str(form, k));
  const file = form.get("proofFile");
  if (file instanceof File && file.size > 0) body.set("proofFile", file, file.name);
  await runAndRedirect(`/admin/orders/${number}`, () => api.post(`/admin/orders/${number}/steps`, body), "Order updated");
}

export async function createSupplierAction(form: FormData) {
  await requireRole(STAFF_ROLES);
  await runAndRedirect(
    "/admin/suppliers",
    () => api.post("/admin/suppliers", { name: str(form, "name"), city: str(form, "city"), gstin: str(form, "gstin"), loginEmail: str(form, "loginEmail") }),
    "Supplier added",
  );
}

export async function supplierStatusAction(supplierId: string, status: "approved" | "suspended") {
  await requireRole(STAFF_ROLES);
  await runAndRedirect("/admin/suppliers", () => api.post(`/admin/suppliers/${supplierId}/status`, { status }), `Supplier ${status}`);
}

export async function supplierRateAction(supplierId: string, form: FormData) {
  await requireRole(["hsp_admin", "hsp_procurement"]);
  await runAndRedirect(
    "/admin/suppliers",
    () =>
      api.post(`/admin/suppliers/${supplierId}/rates`, {
        sku: str(form, "sku"),
        costPaise: rupeesToPaise(form.get("cost")) ?? 0,
        leadTimeDays: Number(str(form, "leadTime")) || 7,
      }),
    "Rate saved",
  );
}

/* ── Partners ── */

export async function verifyPartnerAction(partnerId: string) {
  await requireRole(["hsp_admin", "hsp_finance"]);
  await runAndRedirect("/admin/partners", () => api.post(`/admin/partners/${partnerId}/verify`), "KYC verified — partner activated");
}

export async function partnerStatusAction(partnerId: string, status: "suspended" | "active") {
  await requireRole(["hsp_admin"]);
  await runAndRedirect("/admin/partners", () => api.post(`/admin/partners/${partnerId}/status`, { status }), `Partner ${status}`);
}

export async function depositAction(partnerId: string, form: FormData) {
  await requireRole(["hsp_admin", "hsp_finance"]);
  await runAndRedirect("/admin/partners", () => api.post(`/admin/partners/${partnerId}/deposit`, { depositPaise: rupeesToPaise(form.get("deposit")) ?? 0 }), "Deposit recorded as liability");
}

export async function approveCommissionsAction(partnerId: string) {
  await requireRole(["hsp_admin", "hsp_finance"]);
  await runAndRedirect("/admin/partners", () => api.post(`/admin/partners/${partnerId}/approve-commissions`), "Eligible commissions approved");
}

export async function keyAccountAction(customerId: string, on: boolean) {
  await requireRole(["hsp_admin"]);
  await runAndRedirect("/admin/partners", () => api.post(`/admin/customers/${customerId}/key-account`, { on }), on ? "Marked as national key account" : "Key account flag removed");
}

/* ── Payouts & campaigns ── */

export async function requestPayoutAction(partnerId: string) {
  await requireRole(["hsp_admin", "hsp_finance"]);
  await runAndRedirect("/admin/payouts", () => api.post(`/admin/partners/${partnerId}/payouts`), "Payout raised — awaiting second approval");
}

export async function approvePayoutAction(payoutId: string) {
  await requireRole(["hsp_admin", "hsp_finance"]);
  await runAndRedirect("/admin/payouts", () => api.post(`/admin/payouts/${payoutId}/approve`), "Payout approved and transferred");
}

export async function campaignAction(form: FormData) {
  await requireRole(["hsp_admin"]);
  await runAndRedirect("/admin/insights", () => api.post("/admin/campaigns", { template: str(form, "template") || "festive.diwali" }), "Campaign processed — see outbox");
}

/* ── Programmes & recipients ── */

export async function createProgrammeAction(form: FormData) {
  await requireRole(["hsp_admin"]);
  await runAndRedirect(
    "/admin/programmes",
    () =>
      api.post("/admin/programmes", {
        customerName: str(form, "customerName"),
        customerEmail: str(form, "customerEmail"),
        name: str(form, "name"),
        occasion: str(form, "occasion"),
        nextDate: str(form, "nextDate"),
        leadDays: Number(str(form, "leadDays")) || 30,
        lines: str(form, "lines"),
      }),
    "Programme scheduled",
  );
}

export async function runProgrammesAction() {
  await requireRole(["hsp_admin"]);
  const { raised } = await api.post<{ raised: string[] }>("/admin/programmes/run");
  redirect(`/admin/programmes?ok=${encodeURIComponent(raised.length ? `Raised ${raised.join(", ")}` : "Nothing due")}`);
}

export async function uploadRecipientsAction(number: string, form: FormData) {
  await requireRole(["hsp_admin", "hsp_procurement"]);
  const file = form.get("file");
  const csv = file instanceof File && file.size > 0 ? await file.text() : str(form, "csv");
  if (csv.length > 2_000_000) redirect(`/admin/orders/${number}?error=File%20too%20large`);
  await runAndRedirect(`/admin/orders/${number}`, () => api.post(`/admin/orders/${number}/recipients`, { csv }), "Recipients uploaded");
}

/* ── Artwork, credit notes, contracts ── */

export async function reviewArtworkAction(number: string, fileId: string, decision: "approved" | "rejected", form: FormData) {
  await requireRole(["hsp_admin", "hsp_procurement"]);
  await runAndRedirect(`/admin/orders/${number}`, () => api.post(`/admin/files/${fileId}/review`, { decision, note: str(form, "note") }), `Artwork ${decision}`);
}

export async function createCreditNoteAction(number: string, form: FormData) {
  await requireRole(["hsp_admin", "hsp_finance"]);
  const lines = [...form.entries()]
    .filter(([k]) => k.startsWith("qty:"))
    .map(([k, v]) => ({ orderLineId: k.slice(4), quantity: Number(v) || 0 }))
    .filter((l) => l.quantity > 0);
  await runAndRedirect(
    `/admin/orders/${number}`,
    () =>
      api.post(`/admin/orders/${number}/credit-notes`, {
        reason: str(form, "reason"),
        lines,
        valuePaise: lines.length ? null : (rupeesToPaise(form.get("value")) ?? null),
        refundPaise: rupeesToPaise(form.get("refund")) ?? 0,
      }),
    "Credit note raised — awaiting second approval",
  );
}

export async function creditNoteStepAction(number: string, cn: string, step: "approve" | "void" | "retry") {
  await requireRole(["hsp_admin", "hsp_finance"]);
  await runAndRedirect(
    `/admin/orders/${number}`,
    () => api.post(`/admin/credit-notes/${cn}/${step}`),
    { approve: "Credit note approved", void: "Credit note voided", retry: "Refund re-requested" }[step],
  );
}

export async function createContractAction(form: FormData) {
  await requireRole(["hsp_admin", "hsp_finance"]);
  const pctVal = Number(str(form, "renewalPct"));
  await runAndRedirect(
    "/admin/partners",
    () =>
      api.post("/admin/contracts", {
        customerEmail: str(form, "customerEmail"),
        partnerCode: str(form, "partnerCode"),
        months: Number(str(form, "months")) || 12,
        renewalCommissionBps: Number.isFinite(pctVal) ? Math.round(pctVal * 100) : -1,
        reference: str(form, "reference"),
      }),
    "Contract recorded — renewal commission applies",
  );
}

export async function endContractAction(contractId: string, form: FormData) {
  await requireRole(["hsp_admin", "hsp_finance"]);
  await runAndRedirect("/admin/partners", () => api.post(`/admin/contracts/${contractId}/end`, { reason: str(form, "reason") }), "Contract ended");
}

/* ── Enquiries (storefront bulk quotes & contact) ── */

export async function enquiryStatusAction(id: string, status: "in_review" | "closed") {
  await requireRole(STAFF_ROLES);
  await runAndRedirect("/admin/enquiries", () => api.post(`/admin/enquiries/${id}/status`, { status }), "Enquiry updated");
}

export async function enquiryQuoteAction(id: string) {
  await requireRole(["hsp_admin"]);
  let quote: string;
  try {
    quote = (await api.post<{ quote: string }>(`/admin/enquiries/${id}/quote`)).quote;
  } catch (e) {
    if (e instanceof ApiError) redirect(`/admin/enquiries?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(`/admin/quotes/${quote}?ok=${encodeURIComponent("Quote drafted from the request — review and send")}`);
}
