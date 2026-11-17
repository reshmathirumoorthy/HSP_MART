import "server-only";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api";

/** Runs a backend mutation and redirects back with ?ok= or ?error= (business errors only; others rethrow). */
export async function runAndRedirect(path: string, fn: () => Promise<unknown>, ok: string, onOk?: string) {
  try {
    await fn();
  } catch (e) {
    if (e instanceof ApiError) redirect(`${path}?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(`${onOk ?? path}?ok=${encodeURIComponent(ok)}`);
}

export const rupeesToPaise = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/[,₹\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : undefined;
};

export const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
