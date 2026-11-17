import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { btn, ErrorText, input } from "../ui";

export default function Login() {
  const qc = useQueryClient();
  const [identifier, setIdentifier] = useState("");
  const [sent, setSent] = useState<{ identifier: string; devCode?: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!sent) setSent(await api("/auth/otp", { identifier }));
      else {
        await api("/auth/verify", { identifier: sent.identifier, code });
        await qc.invalidateQueries({ queryKey: ["me"] });
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto mt-24 max-w-sm space-y-3 rounded-lg border border-line bg-white p-6">
      <h1 className="text-lg font-semibold">HSP admin sign in</h1>
      {!sent ? (
        <label className="block text-sm">Email or mobile
          <input className={input} value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoFocus />
        </label>
      ) : (
        <label className="block text-sm">Code sent to {sent.identifier}
          <input className={input} value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} required autoFocus />
          {sent.devCode && <span data-testid="dev-code" className="text-xs text-muted">Dev code: {sent.devCode}</span>}
        </label>
      )}
      <ErrorText error={error} />
      <button className={btn} disabled={busy}>{sent ? "Sign in" : "Send code"}</button>
    </form>
  );
}
