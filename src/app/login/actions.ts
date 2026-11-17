"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LANG_COOKIE } from "@/lib/i18n/dict";
import { api, ApiError, BACKEND_URL } from "@/lib/api";
import { canEnter, homeFor, SESSION_COOKIE, type Role } from "@/lib/auth/token";

export type LoginState =
  | { step: "identify"; error?: string }
  | { step: "verify"; identifier: string; display: string; devCode?: string; error?: string };

function safeNext(raw: FormDataEntryValue | null): string | null {
  const v = typeof raw === "string" ? raw : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : null;
}

/** The backend issues the session cookie; copy it onto this response so the browser keeps it. */
async function adoptSessionCookie(res: Response) {
  const raw = res.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!raw) return;
  const token = raw.split(";")[0].slice(SESSION_COOKIE.length + 1);
  const expires = /expires=([^;]+)/i.exec(raw)?.[1];
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expires ? new Date(expires) : undefined,
  });
}

export async function loginAction(prev: LoginState, form: FormData): Promise<LoginState> {
  const intent = form.get("intent");

  if (intent === "request" || prev.step === "identify") {
    try {
      const r = await api.post<{ identifier: string; devCode: string | null }>("/auth/otp", {
        identifier: String(form.get("identifier") ?? ""),
      });
      return { step: "verify", identifier: r.identifier, display: r.identifier, devCode: r.devCode ?? undefined };
    } catch (e) {
      if (e instanceof ApiError) return { step: "identify", error: e.message };
      throw e;
    }
  }

  const res = await fetch(`${BACKEND_URL}/api/auth/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: prev.identifier, code: String(form.get("code") ?? "") }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ...prev, error: typeof data.detail === "string" ? data.detail : "That code is incorrect or has expired." };
  await adoptSessionCookie(res);
  const role = data.role as Role;

  // Carry a language chosen before sign-in into the profile.
  const lang = (await cookies()).get(LANG_COOKIE)?.value;
  if (lang === "en" || lang === "hi") await api.post("/me/locale", { locale: lang }).catch(() => {});

  const next = safeNext(form.get("next"));
  redirect(next && canEnter(role, next) ? next : homeFor(role));
}

export async function logoutAction() {
  await api.post("/auth/logout").catch(() => {});
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}
