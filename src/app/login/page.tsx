import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { homeFor } from "@/lib/auth/token";
import { LoginForm } from "./LoginForm";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { getT } from "@/lib/i18n/server";
import { MESSAGES } from "@/lib/i18n/dict";
import { loadSiteData } from "@/lib/siteData.server";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await loadSiteData();
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const { locale, t } = await getT();

  return (
    <main className="mx-auto max-w-md px-4 py-16" lang={locale}>
      <div className="mb-6 flex justify-end">
        <LanguageSwitch locale={locale} back={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} />
      </div>
      <h1 data-testid="login-title" className="mb-2 font-serif text-3xl">{t("login.title")}</h1>
      <p className="mb-8 text-[var(--color-text-secondary)]">{t("login.subtitle")}</p>
      <LoginForm next={next} m={MESSAGES[locale]} />
    </main>
  );
}
