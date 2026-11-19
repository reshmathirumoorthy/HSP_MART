"use server";

import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { requireRole, requireUser } from "@/lib/auth/dal";
import { PARTNER_ROLES } from "@/lib/auth/token";
import { runAndRedirect, str } from "@/lib/actionResult";

export async function applyAction(form: FormData) {
  await requireUser("/join");
  await runAndRedirect(
    "/join",
    () =>
      api.post("/partner/apply", {
        type: str(form, "type") === "franchise" ? "franchise" : "associate",
        city: str(form, "city"),
        state: str(form, "state"),
        pan: str(form, "pan"),
        ifsc: str(form, "ifsc"),
        accountLast4: str(form, "accountLast4"),
        gstin: str(form, "gstin"),
        acceptAgreement: form.get("agree") === "on",
      }),
    "Application received. HSP will verify your KYC.",
  );
}

export async function registerLeadAction(form: FormData) {
  await requireRole(PARTNER_ROLES);
  await runAndRedirect(
    "/partner/leads",
    () =>
      api.post("/partner/leads", {
        name: str(form, "name"),
        email: str(form, "email"),
        kind: str(form, "kind") === "individual" ? "individual" : "organisation",
        source: str(form, "source"),
      }),
    "Lead registered — protected for 90 days",
  );
}

export async function partnerQuoteAction(form: FormData) {
  await requireRole(PARTNER_ROLES);
  let number: string;
  try {
    number = (await api.post<{ number: string }>("/partner/quotes", { customerId: str(form, "customerId"), lines: str(form, "lines") })).number;
  } catch (e) {
    if (e instanceof ApiError) redirect(`/partner/quotes?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(`/partner/quotes?ok=${encodeURIComponent(`Quote ${number} created`)}`);
}

export async function partnerSendQuoteAction(number: string) {
  await requireRole(PARTNER_ROLES);
  await runAndRedirect("/partner/quotes", () => api.post(`/partner/quotes/${number}/send`), `Quote ${number} sent`);
}

export async function partnerGrievanceAction(form: FormData) {
  await requireRole(PARTNER_ROLES, "/partner/complaints");
  const order = str(form, "order");
  await runAndRedirect(
    "/partner/complaints",
    () => api.post(`/my/orders/${encodeURIComponent(order)}/grievances`, { category: str(form, "category"), description: str(form, "description") }),
    "Complaint logged — HSP will resolve it within 3 days",
  );
}
