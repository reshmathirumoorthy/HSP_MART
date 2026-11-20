import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api";
import { btn, btnGhost, Card, ErrorText, Loading, PageTitle } from "../ui";

type Kind = { kind: string; columns: string[]; help: string; roles: string[] };
type Result = { kind: string; rows: number; valid: number; skipped: number; errors: string[]; errorCount: number; preview: Record<string, unknown>[]; applied: boolean };
const TITLES: Record<string, string> = {
  product_costs: "1 · Product landed costs and selling prices",
  sales_history: "2 · Last 12 months of sales",
  suppliers: "3 · Suppliers, rates, lead times and stock",
  gst_decisions: "CA's GST decisions (completed gst-review.csv)",
};

export default function Imports({ role }: { role: string }) {
  const q = useQuery({ queryKey: ["imports"], queryFn: () => api<Kind[]>("/admin/imports") });
  return (
    <div className="space-y-4">
      <PageTitle>Data imports</PageTitle>
      <p className="text-sm text-muted">Load the datasets the blueprint asks HSP for (§11). Every file is checked first; nothing is saved unless every row is valid. Datasets 4 (website/integrations) and 5 (staff, costs, tech budget) are entered in the plan, not imported.</p>
      <ErrorText error={q.error} />
      {!q.data ? <Loading /> : q.data.map((k) => <ImportCard key={k.kind} k={k} allowed={k.roles.includes(role)} />)}
    </div>
  );
}

function ImportCard({ k, allowed }: { k: Kind; allowed: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const m = useMutation({
    mutationFn: async (apply: boolean) => {
      const fd = new FormData();
      fd.set("file", file!);
      fd.set("apply", String(apply));
      return api<Result>(`/admin/imports/${k.kind}`, fd);
    },
  });
  const r = m.data;
  return (
    <Card title={TITLES[k.kind] ?? k.kind} testId={`import-${k.kind}`}>
      <p className="mb-2 text-sm text-muted">{k.help}</p>
      <p className="mb-3 text-xs">Columns: <code>{k.columns.join(", ")}</code> · <a className="underline" href={`/api/admin/imports/${k.kind}/template`} download>Download template</a></p>
      {allowed ? (
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" accept=".csv" aria-label={`File for ${k.kind}`} className="text-sm" onChange={(e) => { setFile(e.target.files?.[0] ?? null); m.reset(); }} />
          <button className={btnGhost} disabled={!file || m.isPending} onClick={() => m.mutate(false)}>Check file</button>
          <button className={btn} disabled={!file || m.isPending || !r || r.errorCount > 0 || r.applied} onClick={() => m.mutate(true)}>Import</button>
        </div>
      ) : <p className="text-xs text-muted">Your role cannot run this import.</p>}
      <ErrorText error={m.error} />
      {r && (
        <div className="mt-3 text-sm" role="status" data-testid={`import-result-${k.kind}`}>
          <p>{r.applied ? "Imported" : "Checked"}: {r.rows} rows · {r.valid} valid{r.skipped ? ` · ${r.skipped} skipped (not signed off)` : ""} · {r.errorCount} errors</p>
          {r.errors.length > 0 && <ul className="mt-1 list-disc pl-5 text-bad">{r.errors.slice(0, 20).map((e) => <li key={e}>{e}</li>)}</ul>}
          {!r.applied && r.errorCount === 0 && <p className="text-xs text-muted">File is valid. Press Import to save.</p>}
        </div>
      )}
    </Card>
  );
}
