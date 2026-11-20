import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { api } from "./api";

export const btn =
  "inline-flex items-center rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center rounded-md border border-line bg-white px-3 py-1.5 text-sm hover:bg-stone-50 disabled:opacity-50";
export const input = "w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm";

export function Card({ title, children, testId, action }: { title: string; children: ReactNode; testId?: string; action?: ReactNode }) {
  return (
    <section data-testid={testId} className="rounded-lg border border-line bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const tones: Record<string, string> = {
  good: "bg-green-50 text-good",
  warn: "bg-amber-50 text-warn",
  bad: "bg-red-50 text-bad",
  neutral: "bg-stone-100 text-muted",
};
const GOOD = ["pass", "approved", "active", "closed", "delivered", "captured", "processed", "sent", "accepted", "paid", "quoted", "simulated"];
const BAD = ["fail", "cancelled", "suspended", "failed", "rejected", "reversed", "expired", "void", "blocked", "high"];
const NEUTRAL = ["new", "draft", "none", "ended", "in_review"];

export function Badge({ children }: { children: string }) {
  const tone = GOOD.includes(children) ? "good" : BAD.includes(children) ? "bad" : NEUTRAL.includes(children) ? "neutral" : "warn";
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children.replaceAll("_", " ")}</span>;
}

export function Loading() {
  return <p className="text-sm text-muted">Loading…</p>;
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-bad">
      {error instanceof Error ? error.message : String(error)}
    </p>
  );
}

/** POSTs to the API, then refreshes the given queries. Shows the business error inline. */
export function useAction(path: string, invalidate: unknown[][]) {
  const qc = useQueryClient();
  const [ok, setOk] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: (body: unknown) => api(path, body),
    onSuccess: () => invalidate.forEach((queryKey) => qc.invalidateQueries({ queryKey })),
  });
  return {
    run: (body: unknown, okMessage: string) => {
      setOk(null);
      m.mutate(body, { onSuccess: () => setOk(okMessage) });
    },
    pending: m.isPending,
    feedback: (
      <>
        <ErrorText error={m.error} />
        {ok && !m.error && (
          <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-good">
            {ok}
          </p>
        )}
      </>
    ),
  };
}

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-xl font-semibold">{children}</h1>
      {action}
    </div>
  );
}

export function Table({ head, children, empty, testId }: { head: string[]; children: ReactNode; empty?: boolean; testId?: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-white">
      <table data-testid={testId} className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-muted">
          <tr>{head.map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {children}
          {empty && <tr><td colSpan={head.length} className="px-3 py-4 text-muted">Nothing here yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      {children}
    </label>
  );
}

/** Download links go through the /api proxy so the session cookie is sent. */
export function ExportLink({ kind, children }: { kind: string; children: ReactNode }) {
  return <a className={btnGhost} href={`/api/admin/exports/${kind}`} download>{children}</a>;
}
