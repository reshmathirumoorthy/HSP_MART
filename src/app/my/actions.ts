"use server";

import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth/dal";
import { runAndRedirect } from "@/lib/actionResult";

export async function acceptQuoteAction(number: string) {
  await requireUser(`/my/quotes/${number}`);
  let orderNumber: string;
  try {
    orderNumber = (await api.post<{ orderNumber: string }>(`/my/quotes/${number}/accept`)).orderNumber;
  } catch (e) {
    if (e instanceof ApiError) redirect(`/my/quotes/${number}?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(`/my/orders/${orderNumber}?ok=Order%20confirmed`);
}

export async function payAction(number: string, kind: "advance" | "balance") {
  await requireUser(`/my/orders/${number}`);
  try {
    await api.post(`/my/orders/${number}/pay`, { kind });
  } catch (e) {
    if (e instanceof ApiError) redirect(`/my/orders/${number}?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(`/my/orders/${number}?pay=1`);
}

export async function uploadArtworkAction(number: string, form: FormData) {
  await requireUser(`/my/orders/${number}`);
  const file = form.get("file");
  const body = new FormData();
  if (file instanceof File) body.set("file", file, file.name);
  await runAndRedirect(`/my/orders/${number}`, () => api.post(`/my/orders/${number}/artwork`, body), "Artwork uploaded — HSP will review it");
}
