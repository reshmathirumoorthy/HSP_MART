/**
 * Server-side client for the FastAPI backend (backend/). Every page, server action and route in
 * Next.js reads and writes through here — Next.js holds no database access of its own.
 * The caller's session cookie is forwarded, so the backend authorises every request itself.
 */
import "server-only";
import { cookies } from "next/headers";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

/** A business-rule rejection (HTTP 4xx with a message that is safe to show). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const reviveDates = (_k: string, v: unknown) => (typeof v === "string" && ISO.test(v) ? new Date(v) : v);

type Opts = { dates?: boolean };

async function call<T>(method: string, path: string, body?: unknown, opts: Opts = {}): Promise<T> {
  const jar = await cookies();
  const headers: Record<string, string> = { cookie: jar.toString(), accept: "application/json" };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const req = () => fetch(`${BACKEND_URL}/api${path}`, { method, headers, body: payload, cache: "no-store" });
  let res: Response;
  try {
    res = await req();
  } catch (e) {
    // A pooled keep-alive socket can be closed by the server just as it is reused. Reads are safe
    // to retry once; writes are not retried (the backend may have applied them).
    if (method !== "GET") throw e;
    res = await req();
  }
  const text = await res.text();
  if (!res.ok) {
    let detail = "Something went wrong. Please try again.";
    try {
      const d = JSON.parse(text).detail;
      if (typeof d === "string") detail = d;
      else if (Array.isArray(d) && d[0]?.msg) detail = String(d[0].msg);
    } catch {}
    if (res.status >= 500) throw new Error(`Backend ${method} ${path} failed: ${res.status} ${text.slice(0, 300)}`);
    throw new ApiError(res.status, detail);
  }
  if (!text) return undefined as T;
  return JSON.parse(text, opts.dates === false ? undefined : reviveDates) as T;
}

export const api = {
  get: <T>(path: string, opts?: Opts) => call<T>("GET", path, undefined, opts),
  post: <T = unknown>(path: string, body?: unknown, opts?: Opts) => call<T>("POST", path, body ?? {}, opts),
  delete: <T = unknown>(path: string, opts?: Opts) => call<T>("DELETE", path, undefined, opts),
};

/** GET that returns null on 404 (for pages that call notFound()). */
export async function getOrNull<T>(path: string, opts?: Opts): Promise<T | null> {
  try {
    return await api.get<T>(path, opts);
  } catch (e) {
    if (e instanceof ApiError && [401, 403, 404].includes(e.status)) return null;
    throw e;
  }
}
