import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/login/actions";
import type { CurrentUser } from "@/lib/auth/dal";
import { LanguageSwitch } from "@/components/LanguageSwitch";

export type PortalNavItem = { href: string; label: string };

export function PortalShell({
  title,
  user,
  nav,
  children,
}: {
  title: string;
  user: CurrentUser;
  nav: PortalNavItem[];
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
            HSP GiftOS
          </p>
          <h1 className="font-serif text-2xl">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <LanguageSwitch locale={user.locale} back={nav[0]?.href ?? "/"} />
          <span data-testid="portal-user" className="text-[var(--color-text-secondary)]">
            {user.name ?? user.email ?? user.phone} · <span data-testid="portal-role">{user.role}</span>
          </span>
          <form action={logoutAction}>
            <button className="rounded-md border border-[var(--color-border)] px-3 py-1.5 hover:bg-[var(--color-accent-soft)]">
              Sign out
            </button>
          </form>
        </div>
      </header>
      {nav.length > 0 && (
        <nav className="mb-6 flex flex-wrap gap-2 text-sm">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full border border-[var(--color-border)] px-3 py-1 hover:bg-[var(--color-accent-soft)]"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      )}
      {children}
    </div>
  );
}

export function Stat({ label, value, testId }: { label: string; value: ReactNode; testId?: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <p data-testid={testId} className="mt-1 text-2xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}
