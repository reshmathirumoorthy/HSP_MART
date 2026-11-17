import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, rupeesToPaise } from "../api";
import { btn, btnGhost, Card, ErrorText, Field, input, Loading } from "../ui";
import { imgSrc, useCategories } from "./Products";

type Product = {
  id: string; sku: string; slug: string; name: string; categorySlug: string; subcategory: string | null; pricePaise: number;
  costPaise: number | null; gstRateBps: number; hsnCode: string | null; minOrderQuantity: number; active: boolean; stockStatus: string;
  customizable: boolean; bulkAvailable: boolean; sortOrder: number; content: Record<string, unknown>;
};

const EMPTY: Product = { id: "", sku: "", slug: "", name: "", categorySlug: "", subcategory: "", pricePaise: 0, costPaise: null, gstRateBps: 1800,
  hsnCode: "", minOrderQuantity: 1, active: false, stockStatus: "in_stock", customizable: false, bulkAvailable: true, sortOrder: 1000,
  content: { shortDescription: "", description: "", images: [], unit: "piece" } };

const rupees = (p: number | null) => (p == null ? "" : String(p / 100));

export default function ProductEdit({ canEdit }: { canEdit: boolean }) {
  const { id = "" } = useParams();
  const creating = id === "new";
  const q = useQuery({ queryKey: ["product", id], queryFn: () => api<Product>(`/admin/products/${id}`), enabled: !creating });
  const initial = creating ? EMPTY : q.data;
  if (q.error) return <ErrorText error={q.error} />;
  if (!initial) return <Loading />;
  return <Editor key={id} initial={initial} creating={creating} canEdit={canEdit} />;
}

function Editor({ initial, creating, canEdit }: { initial: Product; creating: boolean; canEdit: boolean }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const cats = useCategories();
  const [p, setP] = useState(initial);
  const [price, setPrice] = useState(rupees(initial.pricePaise));
  const [cost, setCost] = useState(rupees(initial.costPaise));
  const [images, setImages] = useState<string[]>((initial.content.images as string[]) ?? []);
  const [json, setJson] = useState(JSON.stringify(initial.content, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => { setP({ ...p, [k]: v }); setSaved(false); };
  const setContent = (k: string, v: unknown) => {
    const c = { ...safeParse(json), [k]: v };
    setJson(JSON.stringify(c, null, 2));
    setSaved(false);
  };
  const content = safeParse(json);

  const save = useMutation({
    mutationFn: async () => {
      let c: Record<string, unknown>;
      try { c = JSON.parse(json); } catch { throw new Error("Advanced content is not valid JSON."); }
      c.images = images;
      const body = {
        ...(creating ? { id: p.id } : {}),
        name: p.name, sku: p.sku, slug: p.slug, categorySlug: p.categorySlug, subcategory: p.subcategory ?? "",
        pricePaise: rupeesToPaise(price), costPaise: cost.trim() ? rupeesToPaise(cost) : null, gstRateBps: Number(p.gstRateBps),
        hsnCode: p.hsnCode ?? "", minOrderQuantity: Number(p.minOrderQuantity) || 1, stockStatus: p.stockStatus, active: p.active,
        customizable: p.customizable, bulkAvailable: p.bulkAvailable, sortOrder: Number(p.sortOrder) || 0, content: c,
      };
      return creating ? api<{ id: string }>("/admin/products", body) : api(`/admin/products/${p.id}`, body).then(() => ({ id: p.id }));
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", r.id] });
      setSaved(true);
      if (creating) nav(`/products/${r.id}`);
    },
  });
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(); };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/products" className="text-sm text-muted underline">Products</Link>
        <h1 className="text-xl font-semibold">{creating ? "New product" : p.name}</h1>
        {!creating && <a className="text-sm underline" href={`${import.meta.env.VITE_STOREFRONT_URL ?? "http://localhost:3000"}/products/${p.slug}`} target="_blank" rel="noreferrer">View on store</a>}
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card title="Basics">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Name"><input className={input} value={p.name} disabled={!canEdit} required
                onChange={(e) => {
                  const name = e.target.value;
                  // New products: suggest slug and id from the name until they are edited by hand.
                  const auto = creating && (p.slug === "" || p.slug === slugify(p.name));
                  setP({ ...p, name, ...(auto ? { slug: slugify(name), id: slugify(name) } : {}) });
                  setSaved(false);
                }} /></Field>
              <Field label="SKU"><input className={input} value={p.sku} onChange={(e) => set("sku", e.target.value)} disabled={!canEdit} required /></Field>
              <Field label="URL slug"><input className={input} value={p.slug} onChange={(e) => set("slug", e.target.value)} disabled={!canEdit} required /></Field>
              {creating && <Field label="Product id (permanent)"><input className={input} value={p.id} onChange={(e) => set("id", e.target.value)} required /></Field>}
              <Field label="Category">
                <select className={input} value={p.categorySlug} onChange={(e) => set("categorySlug", e.target.value)} disabled={!canEdit} required>
                  <option value="">Choose…</option>
                  {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Subcategory"><input className={input} value={p.subcategory ?? ""} onChange={(e) => set("subcategory", e.target.value)} disabled={!canEdit} /></Field>
            </div>
          </Card>
          <Card title="Description">
            <div className="space-y-3">
              <Field label="Short description"><input className={input} value={String(content.shortDescription ?? "")} onChange={(e) => setContent("shortDescription", e.target.value)} disabled={!canEdit} /></Field>
              <Field label="Full description"><textarea rows={5} className={input} value={String(content.description ?? "")} onChange={(e) => setContent("description", e.target.value)} disabled={!canEdit} /></Field>
              <Field label="Unit (e.g. piece, set, pack)"><input className={input} value={String(content.unit ?? "")} onChange={(e) => setContent("unit", e.target.value)} disabled={!canEdit} /></Field>
            </div>
          </Card>
          <Card title="Images">
            <ul className="space-y-2">
              {images.map((src, i) => (
                <li key={i} className="flex items-center gap-2">
                  <img src={imgSrc(src)} alt="" className="h-12 w-12 rounded object-cover" />
                  <input aria-label={`Image ${i + 1}`} className={input} value={src} onChange={(e) => { const n = [...images]; n[i] = e.target.value; setImages(n); setSaved(false); }} disabled={!canEdit} />
                  {canEdit && <>
                    <button type="button" className={btnGhost} disabled={i === 0} onClick={() => { const n = [...images]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; setImages(n); }}>↑</button>
                    <button type="button" className={btnGhost} onClick={() => setImages(images.filter((_, j) => j !== i))}>Remove</button>
                  </>}
                </li>
              ))}
            </ul>
            {canEdit && <button type="button" className={`${btnGhost} mt-2`} onClick={() => setImages([...images, ""])}>Add image</button>}
            <p className="mt-2 text-xs text-muted">Use a storefront path such as /images/products/name.jpg, or an https:// image URL. The first image is the main photo.</p>
          </Card>
          <Card title="Advanced content (JSON)">
            <p className="mb-2 text-xs text-muted">Specifications, variants, customization studio and hamper settings. Price, stock, MOQ and status are set in the panels, not here.</p>
            <textarea aria-label="Advanced content" rows={14} spellCheck={false} className={`${input} font-mono text-xs`} value={json} disabled={!canEdit}
              onChange={(e) => { setJson(e.target.value); setSaved(false); try { JSON.parse(e.target.value); setJsonError(null); } catch (err) { setJsonError((err as Error).message); } }} />
            {jsonError && <p className="mt-1 text-xs text-bad">{jsonError}</p>}
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Price & tax">
            <div className="space-y-3">
              <Field label="Selling price ₹ (excl. GST; 0 = price on request)"><input className={input} inputMode="decimal" value={price} onChange={(e) => { setPrice(e.target.value); setSaved(false); }} disabled={!canEdit} /></Field>
              <Field label="Landed cost ₹ (internal)"><input className={input} inputMode="decimal" value={cost} onChange={(e) => { setCost(e.target.value); setSaved(false); }} disabled={!canEdit} /></Field>
              <Field label="GST rate">
                <select className={input} value={p.gstRateBps} onChange={(e) => set("gstRateBps", Number(e.target.value))} disabled={!canEdit}>
                  {[0, 500, 1200, 1800, 2800].map((b) => <option key={b} value={b}>{b / 100}%</option>)}
                </select>
              </Field>
              <Field label="HSN code"><input className={input} value={p.hsnCode ?? ""} onChange={(e) => set("hsnCode", e.target.value)} disabled={!canEdit} /></Field>
            </div>
          </Card>
          <Card title="Availability">
            <div className="space-y-3">
              <Check label="Visible on the store" checked={p.active} onChange={(v) => set("active", v)} disabled={!canEdit} />
              <Field label="Stock">
                <select className={input} value={p.stockStatus} onChange={(e) => set("stockStatus", e.target.value)} disabled={!canEdit}>
                  <option value="in_stock">In stock</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option>
                </select>
              </Field>
              <Field label="Minimum order quantity"><input className={input} type="number" min={1} value={p.minOrderQuantity} onChange={(e) => set("minOrderQuantity", Number(e.target.value))} disabled={!canEdit} /></Field>
              <Check label="Customisable (logo / name)" checked={p.customizable} onChange={(v) => set("customizable", v)} disabled={!canEdit} />
              <Check label="Available in bulk" checked={p.bulkAvailable} onChange={(v) => set("bulkAvailable", v)} disabled={!canEdit} />
              <Field label="Listing order (lower first)"><input className={input} type="number" value={p.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} disabled={!canEdit} /></Field>
            </div>
          </Card>
          {canEdit && (
            <div className="space-y-2">
              <ErrorText error={save.error} />
              {saved && <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-good">Saved — live on the store.</p>}
              <button className={btn} disabled={save.isPending || !!jsonError}>{creating ? "Create product" : "Save changes"}</button>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}

function Check({ label, checked, onChange, disabled }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} /> {label}</label>;
}

function safeParse(s: string): Record<string, unknown> {
  try { return JSON.parse(s); } catch { return {}; }
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
