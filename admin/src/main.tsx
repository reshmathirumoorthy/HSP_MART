import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router";
import "./index.css";
import { api, ApiError, type Me } from "./api";
import { Loading } from "./ui";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Quotes from "./pages/Quotes";
import Suppliers from "./pages/Suppliers";
import Partners from "./pages/Partners";
import Payouts from "./pages/Payouts";
import QuoteDetail from "./pages/QuoteDetail";
import Assistant from "./pages/Assistant";
import Insights from "./pages/Insights";
import Programmes from "./pages/Programmes";
import Enquiries from "./pages/Enquiries";
import Grievances from "./pages/Grievances";
import Plan from "./pages/Plan";
import Imports from "./pages/Imports";
import Users from "./pages/Users";
import Products from "./pages/Products";
import ProductEdit from "./pages/ProductEdit";
import Content from "./pages/Content";

const STAFF = ["hsp_admin", "hsp_finance", "hsp_procurement"];
const qc = new QueryClient({
  defaultOptions: { queries: { retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2 } },
});

const NAV = [
  ["/", "Overview"],
  ["/orders", "Orders"],
  ["/enquiries", "Enquiries"],
  ["/complaints", "Complaints"],
  ["/products", "Products"],
  ["/content", "Site content"],
  ["/quotes", "Quotes"],
  ["/assistant", "Assistant"],
  ["/suppliers", "Suppliers"],
  ["/partners", "Partners"],
  ["/payouts", "Payouts"],
  ["/insights", "Insights"],
  ["/plan", "Plan & readiness"],
  ["/imports", "Data imports"],
  ["/programmes", "Programmes"],
  ["/users", "Staff & roles"],
] as const;

function Shell() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/auth/me") });
  if (me.isLoading) return <div className="p-8"><Loading /></div>;
  if (!me.data) return <Login />;
  if (!STAFF.includes(me.data.role))
    return <p className="p-8 text-sm">This account ({me.data.role}) has no admin access.</p>;
  const logout = async () => {
    await api("/auth/logout", {});
    qc.clear();
    location.assign("/");
  };
  return (
    <div className="min-h-screen md:grid md:grid-cols-[200px_1fr]">
      <aside className="border-b border-line bg-white p-4 md:border-b-0 md:border-r">
        <p className="mb-4 font-semibold text-brand">HSP Admin</p>
        <nav className="flex flex-wrap gap-1 md:flex-col">
          {NAV.filter(([to]) => to !== "/users" || me.data.role === "hsp_admin").map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) => `rounded px-2 py-1 text-sm ${isActive ? "bg-stone-100 font-medium" : "text-muted hover:text-ink"}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-6 truncate text-xs text-muted">{me.data.email ?? me.data.role}</p>
        <button onClick={logout} className="text-xs underline">Sign out</button>
      </aside>
      <main className="min-w-0 p-4 md:p-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:number" element={<OrderDetail role={me.data.role} />} />
          <Route path="/enquiries" element={<Enquiries role={me.data.role} />} />
          <Route path="/users" element={me.data.role === "hsp_admin" ? <Users userId={me.data.id} /> : <p className="text-sm">Only admins can manage staff.</p>} />
          <Route path="/plan" element={<Plan role={me.data.role} />} />
          <Route path="/imports" element={<Imports role={me.data.role} />} />
          <Route path="/complaints" element={<Grievances role={me.data.role} />} />
          <Route path="/products" element={<Products canEdit={["hsp_admin", "hsp_procurement"].includes(me.data.role)} />} />
          <Route path="/products/:id" element={<ProductEdit canEdit={["hsp_admin", "hsp_procurement"].includes(me.data.role)} />} />
          <Route path="/content" element={<Content canEdit={me.data.role === "hsp_admin"} />} />
          <Route path="/quotes" element={<Quotes role={me.data.role} />} />
          <Route path="/quotes/:number" element={<QuoteDetail role={me.data.role} userId={me.data.id} />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/partners" element={<Partners role={me.data.role} userId={me.data.id} />} />
          <Route path="/payouts" element={<Payouts role={me.data.role} userId={me.data.id} />} />
          <Route path="/insights" element={<Insights role={me.data.role} />} />
          <Route path="/programmes" element={<Programmes role={me.data.role} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter><Shell /></BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
