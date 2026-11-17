"use server";

import { api } from "@/lib/api";
import { requireRole } from "@/lib/auth/dal";
import { runAndRedirect } from "@/lib/actionResult";

export async function acknowledgeAction(poId: string) {
  await requireRole(["supplier"]);
  await runAndRedirect("/supplier", () => api.post(`/supplier/purchase-orders/${poId}/acknowledge`), "Purchase order acknowledged");
}

export async function stockAction(rateId: string, form: FormData) {
  await requireRole(["supplier"]);
  const stock = Number(form.get("stock"));
  await runAndRedirect("/supplier", () => api.post(`/supplier/rates/${rateId}/stock`, { stock: Number.isInteger(stock) ? stock : -1 }), "Stock updated");
}
