import { setLocaleAction } from "@/lib/i18n/actions";
import type { Locale } from "@/lib/i18n/dict";

export function LanguageSwitch({ locale, back }: { locale: Locale; back: string }) {
  return (
    <div className="flex gap-1 text-xs" aria-label="Language">
      {(["en", "hi"] as const).map((l) => (
        <form key={l} action={setLocaleAction.bind(null, l, back)}>
          <button
            aria-pressed={locale === l}
            lang={l}
            className={`rounded-full border px-2.5 py-1 ${locale === l ? "border-[var(--color-brand)] bg-[var(--color-accent-soft)]" : "border-[var(--color-border)]"}`}
          >
            {l === "en" ? "English" : "हिन्दी"}
          </button>
        </form>
      ))}
    </div>
  );
}
