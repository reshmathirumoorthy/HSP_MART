import "server-only";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/dal";
import { LANG_COOKIE, LOCALES, translator, type Locale } from "./dict";

/** Signed-in users: their saved preference. Visitors: the language cookie. */
export async function getLocale(): Promise<Locale> {
  const user = await getCurrentUser();
  if (user) return user.locale;
  const c = (await cookies()).get(LANG_COOKIE)?.value as Locale | undefined;
  return c && LOCALES.includes(c) ? c : "en";
}

export async function getT() {
  const locale = await getLocale();
  return { locale, t: translator(locale) };
}
