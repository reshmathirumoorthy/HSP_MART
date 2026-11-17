/**
 * Browser-side client for the backend. Requests go to same-origin /api/*, which Next.js forwards
 * to FastAPI, so the httpOnly session cookie travels with them.
 */
export class ClientApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function clientApi<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const method = init?.method ?? (init?.body === undefined ? "GET" : "POST");
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: init?.body === undefined ? undefined : { "content-type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = (data as { detail?: unknown }).detail;
    const msg = typeof d === "string" ? d : Array.isArray(d) && d[0]?.msg ? String(d[0].msg) : "Something went wrong. Please try again.";
    throw new ClientApiError(res.status, msg);
  }
  return data as T;
}
