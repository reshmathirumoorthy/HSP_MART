"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import type { MessageKey } from "@/lib/i18n/dict";

const field =
  "w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2.5 text-base outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-accent-soft)]";
const button =
  "w-full rounded-md bg-[var(--color-brand)] px-4 py-2.5 font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-60";

export function LoginForm({ next, m }: { next?: string; m: Record<MessageKey, string> }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {
    step: "identify",
  });

  return (
    <form action={action} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}

      {state.step === "identify" ? (
        <>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{m["login.identifier"]}</span>
            <input
              name="identifier"
              autoComplete="username"
              required
              className={field}
              placeholder="you@company.com or 98xxxxxxxx"
            />
          </label>
          <input type="hidden" name="intent" value="request" />
          <button className={button} disabled={pending}>
            {pending ? m["login.sending"] : m["login.send"]}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {m["login.sent"]} <strong>{state.display}</strong>.
          </p>
          {state.devCode && (
            <p
              data-testid="dev-otp"
              className="rounded-md bg-[var(--color-gold-soft)] px-3 py-2 text-sm"
            >
              Development code: <code className="font-semibold">{state.devCode}</code>
            </p>
          )}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{m["login.code"]}</span>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              className={`${field} tracking-[0.4em]`}
            />
          </label>
          <input type="hidden" name="intent" value="verify" />
          <button className={button} disabled={pending}>
            {pending ? m["login.verifying"] : m["login.submit"]}
          </button>
        </>
      )}

      {state.error && (
        <p role="alert" data-testid="form-error" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
