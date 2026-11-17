"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/dal";
import { LANG_COOKIE, LOCALES, type Locale } from "./dict";

export async function setLocaleAction(locale: Locale, back: string) {
  if (!LOCALES.includes(locale)) return;
  (await cookies()).set(LANG_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  if (await getCurrentUser()) await api.post("/me/locale", { locale });
  redirect(back.startsWith("/") && !back.startsWith("//") ? back : "/");
}
