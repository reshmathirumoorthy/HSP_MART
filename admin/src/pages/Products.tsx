import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { api, inr } from "../api";
import { Badge, btn, ErrorText, input, Loading, PageTitle, Table } from "../ui";

type Row = { id: string; sku: string; name: string; categorySlug: string; subcategory: string | null; pricePaise: number; costPaise: number | null;
  minOrderQuantity: number; active: boolean; stockStatus: string; customizable: boolean; image: string };
type Category = { slug: string; name: string };
const PAGE = 50;

export default function Products({ canEdit }: { canEdit: boolean }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const params = new URLSearchParams({ q, category, status, limit: String(PAGE), offset: String(page * PAGE) });
  const list = useQuery({ queryKey: ["products", q, category, status, page], queryFn: () => api<{ items: Row[]; total: number }>(`/admin/products?${params}`) });
  const cats = useCategories();
  return (
    <div className="space-y-4">
      <PageTitle action={canEdit && <Link className={btn} to="/products/new">Add product</Link>}>Products</PageTitle>
      <p className="text-sm text-muted">The storefront catalogue. Changes appear on hspmart.com within seconds; checkout and quotes always use the prices saved here.</p>
      <div className="flex flex-wrap gap-2">
        <input aria-label="Search products" placeholder="Search name, SKU or slug" className={`${input} max-w-xs`} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <select aria-label="Category" className={`${input} w-auto`} value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select aria-label="Status" className={`${input} w-auto`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          <option value="">Active and hidden</option><option value="active">Active</option><option value="inactive">Hidden</option>
        </select>
      </div>
      <ErrorText error={list.error} />
      {!list.data ? <Loading /> : (
        <>
          <Table testId="products-table" head={["", "Product", "SKU", "Category", "Price", "MOQ", "Stock", "Status"]} empty={!list.data.items.length}>
            {list.data.items.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-1.5">{p.image ? <img src={imgSrc(p.image)} alt="" className="h-10 w-10 rounded object-cover" /> : <span className="block h-10 w-10 rounded bg-stone-100" />}</td>
                <td className="px-3"><Link className="underline" to={`/products/${p.id}`}>{p.name}</Link>{p.customizable && <span className="ml-1 text-xs text-muted">· customisable</span>}</td>
                <td className="px-3 text-xs">{p.sku}</td>
                <td className="px-3 text-xs">{p.categorySlug}{p.subcategory ? ` · ${p.subcategory}` : ""}</td>
                <td className="px-3 text-right tabular-nums">{p.pricePaise ? inr(p.pricePaise) : "On request"}</td>
                <td className="px-3 text-right">{p.minOrderQuantity}</td>
                <td className="px-3"><Badge>{p.stockStatus}</Badge></td>
                <td className="px-3"><Badge>{p.active ? "active" : "hidden"}</Badge></td>
              </tr>
            ))}
          </Table>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted">{list.data.total} products</span>
            <button className="underline disabled:opacity-40" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <button className="underline disabled:opacity-40" disabled={(page + 1) * PAGE >= list.data.total} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}

/** Storefront images are site paths served by the storefront (or https:// URLs). */
export function imgSrc(path: string) {
  return path;
}

export function useCategories(): Category[] {
  const q = useQuery({ queryKey: ["content"], queryFn: () => api<{ content: { categories: Category[] | null } }>("/admin/content") });
  return q.data?.content.categories ?? [];
}
