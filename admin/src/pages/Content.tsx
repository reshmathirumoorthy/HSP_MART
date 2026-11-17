import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, when } from "../api";
import { btn, btnGhost, ErrorText, input, Loading, PageTitle } from "../ui";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type Data = { content: Record<string, Json>; meta: Record<string, { updatedAt: string; updatedBy: string | null }> };

const SECTIONS: { key: string; label: string; help: string }[] = [
  { key: "announcement", label: "Announcement bar", help: "Top-of-page messages. {freeShippingThreshold} shows the live free-delivery threshold." },
  { key: "home", label: "Homepage", help: "Hero, occasions and section copy. Leave a section's productIds empty to pick products automatically." },
  { key: "navigation", label: "Menus & footer", help: "Main menu, gifting links and footer columns." },
  { key: "categories", label: "Categories", help: "Catalogue categories (slug is used in URLs; a category in use cannot be removed)." },
  { key: "company", label: "Company & contact", help: "Name, tagline, description, services and contact details used across the site." },
  { key: "faqs", label: "FAQs", help: "Questions on the FAQ page." },
  { key: "about", label: "About page", help: "Headings and buttons on the About page (the text comes from Company)." },
];

export default function Content({ canEdit }: { canEdit: boolean }) {
  const q = useQuery({ queryKey: ["content"], queryFn: () => api<Data>("/admin/content") });
  const [tab, setTab] = useState(SECTIONS[0].key);
  if (q.error) return <ErrorText error={q.error} />;
  if (!q.data) return <Loading />;
  const section = SECTIONS.find((s) => s.key === tab)!;
  const meta = q.data.meta[tab];
  return (
    <div className="space-y-4">
      <PageTitle>Site content</PageTitle>
      <div className="flex flex-wrap gap-1" role="tablist">
        {SECTIONS.map((s) => (
          <button key={s.key} role="tab" aria-selected={s.key === tab} onClick={() => setTab(s.key)}
            className={`rounded px-3 py-1.5 text-sm ${s.key === tab ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-line"}`}>{s.label}</button>
        ))}
      </div>
      <p className="text-sm text-muted">{section.help}{meta && <> · Last saved {when(meta.updatedAt)}{meta.updatedBy ? ` by ${meta.updatedBy}` : ""}</>}</p>
      <SectionEditor key={tab} k={tab} value={q.data.content[tab]} canEdit={canEdit} />
    </div>
  );
}

function SectionEditor({ k, value, canEdit }: { k: string; value: Json; canEdit: boolean }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Json>(value);
  const [raw, setRaw] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: () => api(`/admin/content/${k}`, { value: raw != null ? JSON.parse(raw) : draft }),
    onSuccess: () => { setSaved(true); qc.invalidateQueries({ queryKey: ["content"] }); },
  });
  const change = (v: Json) => { setDraft(v); setSaved(false); };
  return (
    <section className="space-y-3 rounded-lg border border-line bg-white p-4" data-testid={`content-${k}`}>
      <div className="flex justify-end">
        <button type="button" className="text-xs underline" onClick={() => setRaw(raw == null ? JSON.stringify(draft, null, 2) : null)}>
          {raw == null ? "Edit as JSON" : "Back to form"}
        </button>
      </div>
      {raw != null ? (
        <textarea aria-label="Content JSON" rows={22} spellCheck={false} className={`${input} font-mono text-xs`} value={raw} disabled={!canEdit} onChange={(e) => { setRaw(e.target.value); setSaved(false); }} />
      ) : (
        <Node value={draft} onChange={change} path={k} disabled={!canEdit} />
      )}
      {canEdit && (
        <div className="flex items-center gap-3 border-t border-line pt-3">
          <button className={btn} disabled={save.isPending} onClick={() => save.mutate()}>Save {k}</button>
          {saved && <span role="status" className="text-sm text-good">Saved — live on the store.</span>}
          <ErrorText error={save.error} />
        </div>
      )}
    </section>
  );
}

const label = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

/** Generic structured editor for any JSON value: objects as fields, arrays as repeatable rows. */
function Node({ value, onChange, path, disabled }: { value: Json; onChange: (v: Json) => void; path: string; disabled: boolean }) {
  if (Array.isArray(value)) {
    const template = value.length ? blank(value[0]) : "";
    return (
      <div className="space-y-2">
        {value.map((item, i) => (
          <div key={i} className="flex gap-2 rounded-md border border-line p-2">
            <div className="min-w-0 flex-1"><Node value={item} path={`${path}.${i}`} disabled={disabled} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} /></div>
            {!disabled && (
              <div className="flex flex-col gap-1">
                <button type="button" aria-label="Move up" className={btnGhost} disabled={i === 0} onClick={() => { const n = [...value]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); }}>↑</button>
                <button type="button" aria-label="Remove" className={btnGhost} onClick={() => onChange(value.filter((_, j) => j !== i))}>✕</button>
              </div>
            )}
          </div>
        ))}
        {!disabled && <button type="button" className={btnGhost} onClick={() => onChange([...value, template])}>Add</button>}
      </div>
    );
  }
  if (value && typeof value === "object") {
    return (
      <div className="grid gap-3">
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className={v && typeof v === "object" ? "rounded-md bg-stone-50 p-3" : ""}>
            <p className="mb-1 text-xs font-medium text-muted">{label(k)}</p>
            <Node value={v} path={`${path}.${k}`} disabled={disabled} onChange={(nv) => onChange({ ...value, [k]: nv })} />
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "boolean") {
    return <input type="checkbox" aria-label={path} checked={value} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />;
  }
  if (typeof value === "number") {
    return <input type="number" aria-label={path} className={input} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />;
  }
  const s = value ?? "";
  return String(s).length > 90
    ? <textarea aria-label={path} rows={3} className={input} value={String(s)} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    : <input aria-label={path} className={input} value={String(s)} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
}

function blank(v: Json): Json {
  if (Array.isArray(v)) return [];
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blank(x)]));
  if (typeof v === "boolean") return false;
  if (typeof v === "number") return 0;
  return "";
}
