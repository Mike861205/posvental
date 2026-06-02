"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import {
  Search, ShoppingCart, Plus, Minus, Trash2, Banknote, CreditCard, ArrowLeftRight, Clock,
  TrendingDown, TrendingUp, LockKeyhole, Receipt, Package, X, Calculator,
} from "lucide-react";

type Product = { id: string; name: string; code: string | null; price: string | number; stock: number };
type ProductCategory = { id: string; name: string };
type POSProduct = Product & { categoryId?: string | null; category?: ProductCategory | null; featured?: boolean };
type MemberOption = { id: string; fullName: string };
type Movement = { id: string; type: "INCOME" | "EXPENSE"; concept: string; amount: string | number; method: string; createdAt: string };
type SaleItem = { id: string; name: string; price: string | number; quantity: number; total: string | number };
type Sale = { id: string; total: string | number; method: string; status: string; createdAt: string; items: SaleItem[] };
type Register = {
  id: string;
  status: "OPEN" | "CLOSED";
  openingCash: string | number;
  openedAt: string;
  movements: Movement[];
  sales: Sale[];
};

type CartItem = { product: Product; qty: number };
type Method = "CASH" | "CARD" | "TRANSFER" | "CREDIT";
type LastSale = { total: string | number; method: Method; status: string; change: number };
const GENERAL_CUSTOMER_ID = "GENERAL";

const methodMeta: Record<Method, { label: string; Icon: any; color: string }> = {
  CASH:     { label: "Efectivo",     Icon: Banknote,        color: "from-emerald-500 to-emerald-600" },
  CARD:     { label: "Tarjeta",      Icon: CreditCard,      color: "from-blue-500 to-indigo-600" },
  TRANSFER: { label: "Transferencia",Icon: ArrowLeftRight,  color: "from-violet-500 to-fuchsia-600" },
  CREDIT:   { label: "Crédito",      Icon: Clock,           color: "from-amber-500 to-orange-600" },
};

export function POSClient({
  initialProducts,
  initialRegister,
  initialMembers,
  topSellingIds,
}: Readonly<{
  initialProducts: POSProduct[];
  initialRegister: Register | null;
  initialMembers: MemberOption[];
  topSellingIds: string[];
}>) {
  const router = useRouter();
  const products = initialProducts;
  const members = initialMembers;
  const [register, setRegister] = useState<Register | null>(initialRegister);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [q, setQ] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL");
  const [discount, setDiscount] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState(GENERAL_CUSTOMER_ID);
  const [method, setMethod] = useState<Method>("CASH");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [showOpen, setShowOpen] = useState(!initialRegister);
  const [showClose, setShowClose] = useState(false);
  const [showMovement, setShowMovement] = useState<null | "INCOME" | "EXPENSE">(null);
  const [lastSale, setLastSale] = useState<LastSale | null>(null);
  const [closingCashInput, setClosingCashInput] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch = !t || p.name.toLowerCase().includes(t) || (p.code ?? "").toLowerCase().includes(t);
      const matchesCategory = selectedCategoryId === "ALL" || p.categoryId === selectedCategoryId;
      return matchesSearch && matchesCategory;
    });
  }, [products, q, selectedCategoryId]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of products) {
      if (product.category?.id && product.category.name) {
        map.set(product.category.id, product.category.name);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [products]);

  const principalProducts = useMemo(() => {
    const featured = filtered.filter((p) => p.featured);
    const byTopSelling = topSellingIds
      .map((id) => filtered.find((p) => p.id === id))
      .filter((p): p is POSProduct => !!p && !featured.some((f) => f.id === p.id));

    return [...featured, ...byTopSelling].slice(0, 8);
  }, [filtered, topSellingIds]);

  const subtotal = cart.reduce((acc, i) => acc + Number(i.product.price) * i.qty, 0);
  const total = Math.max(0, subtotal - (discount || 0));
  const change = method === "CASH" && cashReceived ? Math.max(0, Number(cashReceived) - total) : 0;

  // Resumen de caja
  const summary = useMemo(() => {
    if (!register) return null;
    const cashSales = register.sales.filter((s) => s.method === "CASH" && s.status === "PAID").reduce((a, s) => a + Number(s.total), 0);
    const cardSales = register.sales.filter((s) => s.method === "CARD" && s.status === "PAID").reduce((a, s) => a + Number(s.total), 0);
    const transferSales = register.sales.filter((s) => s.method === "TRANSFER" && s.status === "PAID").reduce((a, s) => a + Number(s.total), 0);
    const creditSales = register.sales.filter((s) => s.method === "CREDIT").reduce((a, s) => a + Number(s.total), 0);
    const incomes = register.movements.filter((m) => m.type === "INCOME" && m.method === "CASH").reduce((a, m) => a + Number(m.amount), 0);
    const expenses = register.movements.filter((m) => m.type === "EXPENSE" && m.method === "CASH").reduce((a, m) => a + Number(m.amount), 0);
    const expectedCash = Number(register.openingCash) + cashSales + incomes - expenses;
    const totalSales = cashSales + cardSales + transferSales + creditSales;
    return { cashSales, cardSales, transferSales, creditSales, incomes, expenses, expectedCash, totalSales };
  }, [register]);

  function addToCart(p: Product) {
    setCart((prev) => {
      const ex = prev.find((c) => c.product.id === p.id);
      if (ex) return prev.map((c) => (c.product.id === p.id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { product: p, qty: 1 }];
    });
  }
  function changeQty(id: string, delta: number) {
    setCart((prev) =>
      prev.flatMap((c) => {
        if (c.product.id !== id) return [c];
        const nq = c.qty + delta;
        if (nq <= 0) return [];
        return [{ ...c, qty: nq }];
      })
    );
  }
  function removeItem(id: string) {
    setCart((prev) => prev.filter((c) => c.product.id !== id));
  }
  function clearCart() {
    setCart([]); setDiscount(0); setSelectedCustomerId(GENERAL_CUSTOMER_ID); setCashReceived(""); setMethod("CASH");
  }

  async function openRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/pos/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setLoading(false);
    if (!res.ok) { setError("No se pudo abrir caja"); return; }
    setShowOpen(false);
    router.refresh();
  }

  async function closeRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!register) return;
    setLoading(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/pos/register/${register.id}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setLoading(false);
    if (!res.ok) { setError("No se pudo cerrar caja"); return; }
    setShowClose(false);
    setRegister(null);
    router.refresh();
  }

  async function addMovement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!showMovement) return;
    setLoading(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    const res = await fetch("/api/pos/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, type: showMovement }),
    });
    setLoading(false);
    if (!res.ok) { setError("Error al guardar"); return; }
    setShowMovement(null);
    router.refresh();
  }

  async function checkout() {
    if (cart.length === 0 || !register) return;
    if (method === "CASH" && cashReceived && Number(cashReceived) < total) {
      setError("El efectivo recibido es menor al total"); return;
    }
    setLoading(true); setError(null);
    const selectedMember = members.find((m) => m.id === selectedCustomerId);
    const customerTracking = selectedMember
      ? `member:${selectedMember.id}|${selectedMember.fullName}`
      : "CLIENTE GENERAL";

    const res = await fetch("/api/pos/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((c) => ({ productId: c.product.id, quantity: c.qty })),
        method,
        customer: customerTracking,
        discount: discount || 0,
        cashReceived: method === "CASH" && cashReceived ? Number(cashReceived) : undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) { setError("Error al cobrar"); return; }
    const sale = await res.json();
    setLastSale({ ...sale, change });
    clearCart();
    router.refresh();
  }

  const hasOpenRegister = !!register;

  useEffect(() => {
    if (showClose && summary) {
      setClosingCashInput(summary.expectedCash.toFixed(2));
    }
  }, [showClose, summary]);

  const closingCashCounted = Number(closingCashInput || 0);
  const closingDiff = summary ? closingCashCounted - summary.expectedCash : 0;
  let closingDiffLabel = "Cuadre exacto";
  let closingDiffTone = "text-white";
  let closingDiffDisplay = formatCurrency(0);
  if (closingDiff > 0) {
    closingDiffLabel = "Sobrante";
    closingDiffTone = "text-emerald-300";
    closingDiffDisplay = `+${formatCurrency(closingDiff)}`;
  } else if (closingDiff < 0) {
    closingDiffLabel = "Faltante";
    closingDiffTone = "text-red-300";
    closingDiffDisplay = `-${formatCurrency(Math.abs(closingDiff))}`;
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-900 text-white overflow-hidden">
      {/* Backdrop decorativo */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.25),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.2),transparent_50%)]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><circle cx=%2260%22 cy=%2260%22 r=%221%22 fill=%22white%22 fill-opacity=%220.05%22/></svg>')]" />

      <div className="relative h-full flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-white/10 backdrop-blur-md bg-white/5">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-white/70 hover:text-white text-sm flex items-center gap-1"><X size={16}/> Salir</a>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2"><ShoppingCart size={20}/> Punto de Venta</h1>
              {hasOpenRegister && summary && (
                <p className="text-xs text-white/60">
                  Caja abierta · Apertura {formatCurrency(Number(register.openingCash))} · Esperado en caja {formatCurrency(summary.expectedCash)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={!hasOpenRegister}
              onClick={() => setShowMovement("INCOME")}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-sm disabled:opacity-40"
            ><TrendingUp size={14}/> Ingreso</button>
            <button
              disabled={!hasOpenRegister}
              onClick={() => setShowMovement("EXPENSE")}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-sm disabled:opacity-40"
            ><TrendingDown size={14}/> Gasto</button>
            <button
              disabled={!hasOpenRegister}
              onClick={() => setShowClose(true)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-sm disabled:opacity-40"
            ><LockKeyhole size={14}/> Corte de caja</button>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_420px] overflow-hidden">
          {/* Productos */}
          <div className="p-6 overflow-y-auto">
            <div className="relative max-w-xl mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar producto por nombre o código…"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-violet-400/60"
              />
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setSelectedCategoryId("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs border transition ${selectedCategoryId === "ALL" ? "bg-violet-500/40 border-violet-300/60 text-white" : "bg-white/5 border-white/10 text-white/70 hover:text-white"}`}
              >
                Todas
              </button>
              {categoryOptions.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition ${selectedCategoryId === category.id ? "bg-violet-500/40 border-violet-300/60 text-white" : "bg-white/5 border-white/10 text-white/70 hover:text-white"}`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {principalProducts.length > 0 && (
              <div className="mb-5">
                <p className="text-xs uppercase tracking-wide text-white/50 mb-2">Productos principales</p>
                <div className="flex flex-wrap gap-2">
                  {principalProducts.map((p) => (
                    <button
                      key={`principal-${p.id}`}
                      onClick={() => addToCart(p)}
                      disabled={!hasOpenRegister}
                      className="px-3 py-1.5 rounded-lg text-xs border border-amber-300/40 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20 disabled:opacity-40"
                    >
                      {p.name} · {formatCurrency(Number(p.price))}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.length === 0 && (
                <div className="col-span-full text-center text-white/50 py-12">
                  <Package className="mx-auto mb-2" size={32} />
                  Sin productos. Agrégalos en <a href="/dashboard/products" className="underline">Productos</a>.
                </div>
              )}
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={!hasOpenRegister}
                  className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-400/50 rounded-2xl p-4 text-left transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
                    {p.stock} und
                  </div>
                  <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-violet-500/40 to-fuchsia-500/40 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                    <Package size={26} />
                  </div>
                  <p className="font-semibold leading-tight line-clamp-2">{p.name}</p>
                  {p.code && <p className="text-xs text-white/40 mt-0.5">{p.code}</p>}
                  <p className="mt-2 text-lg font-bold text-emerald-300">{formatCurrency(Number(p.price))}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Carrito */}
          <aside className="border-l border-white/10 bg-slate-950/60 backdrop-blur-md flex flex-col">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2"><ShoppingCart size={18}/> Carrito ({cart.length})</h2>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-xs text-white/60 hover:text-white">Vaciar</button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              {cart.length === 0 ? (
                <div className="text-center text-white/40 py-10 text-sm">Selecciona productos para agregarlos.</div>
              ) : (
                <ul className="space-y-2">
                  {cart.map((c) => (
                    <li key={c.product.id} className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.product.name}</p>
                        <p className="text-xs text-white/50">{formatCurrency(Number(c.product.price))} c/u</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => changeQty(c.product.id, -1)} className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"><Minus size={12}/></button>
                        <span className="w-7 text-center text-sm">{c.qty}</span>
                        <button onClick={() => changeQty(c.product.id, +1)} className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"><Plus size={12}/></button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(Number(c.product.price) * c.qty)}</p>
                        <button onClick={() => removeItem(c.product.id)} className="text-white/40 hover:text-red-400"><Trash2 size={13}/></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-white/10 p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-white/50 uppercase tracking-wide" htmlFor="pos-customer">Cliente</label>
                  <select
                    id="pos-customer"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white"
                  >
                    <option value={GENERAL_CUSTOMER_ID} style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                      Cliente general
                    </option>
                    {members.map((member) => (
                      <option
                        key={member.id}
                        value={member.id}
                        style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
                      >
                        {member.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-white/50 uppercase tracking-wide" htmlFor="pos-discount">Descuento</label>
                  <input id="pos-discount" type="number" step="0.01" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value) || 0)} className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm" />
                </div>
              </div>

              {selectedCustomerId !== GENERAL_CUSTOMER_ID && (
                <p className="text-[11px] text-emerald-300">Esta venta se guardara para el historial del cliente seleccionado.</p>
              )}

              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(methodMeta) as Method[]).map((m) => {
                  const M = methodMeta[m];
                  const active = method === m;
                  const methodClass = active
                    ? `bg-gradient-to-br ${M.color} border-transparent`
                    : "bg-white/5 border-white/10 hover:bg-white/10";
                  return (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl text-xs border transition ${methodClass}`}
                    >
                      <M.Icon size={16}/> {M.label}
                    </button>
                  );
                })}
              </div>

              {method === "CASH" && (
                <div>
                  <label className="text-[11px] text-white/50 uppercase tracking-wide" htmlFor="pos-cash">Efectivo recibido</label>
                  <input id="pos-cash" type="number" step="0.01" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm" placeholder="0.00"/>
                  {cashReceived && (
                    <p className="text-xs text-emerald-300 mt-1">Cambio: {formatCurrency(change)}</p>
                  )}
                </div>
              )}

              <div className="bg-white/5 rounded-xl p-3 space-y-1 text-sm">
                <div className="flex justify-between text-white/60"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-white/60"><span>Descuento</span><span>-{formatCurrency(discount)}</span></div>}
                <div className="flex justify-between text-lg font-bold pt-1 border-t border-white/10"><span>Total</span><span>{formatCurrency(total)}</span></div>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                onClick={checkout}
                disabled={loading || cart.length === 0 || !hasOpenRegister}
                className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white font-semibold py-3 rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Receipt size={18}/> {loading ? "Cobrando..." : `Cobrar ${formatCurrency(total)}`}
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Modal abrir caja */}
      {showOpen && !hasOpenRegister && (
        <Modal onClose={() => {}} title="Abrir caja" Icon={Calculator}>
          <form onSubmit={openRegister} className="grid gap-3">
            <p className="text-sm text-white/60">Ingresa el monto inicial en caja para comenzar a operar.</p>
            <div>
              <label className="text-xs text-white/60" htmlFor="open-cash">Monto de apertura</label>
              <input id="open-cash" required type="number" step="0.01" name="openingCash" defaultValue={0} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 mt-1"/>
            </div>
            <div>
              <label className="text-xs text-white/60" htmlFor="open-notes">Notas (opcional)</label>
              <input id="open-notes" name="notes" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 mt-1"/>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button disabled={loading} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 rounded-lg font-semibold">
              {loading ? "Abriendo..." : "Abrir caja"}
            </button>
            <button type="button" onClick={() => router.back()} className="w-full py-2.5 rounded-lg font-semibold border border-white/20 text-white/70 hover:bg-white/5 transition">
              Regresar
            </button>
          </form>
        </Modal>
      )}

      {/* Modal movimiento */}
      {showMovement && (
        <Modal onClose={() => setShowMovement(null)} title={showMovement === "INCOME" ? "Registrar ingreso" : "Registrar gasto"} Icon={showMovement === "INCOME" ? TrendingUp : TrendingDown}>
          <form onSubmit={addMovement} className="grid gap-3">
            <div>
              <label className="text-xs text-white/60" htmlFor="mv-concept">Concepto</label>
              <input id="mv-concept" required name="concept" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 mt-1" placeholder={showMovement === "INCOME" ? "Aporte socio" : "Compra agua"}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/60" htmlFor="mv-amount">Monto</label>
                <input id="mv-amount" required type="number" step="0.01" name="amount" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 mt-1"/>
              </div>
              <div>
                <label className="text-xs text-white/60" htmlFor="mv-method-display">Método</label>
                <input
                  id="mv-method-display"
                  value="Efectivo"
                  readOnly
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 mt-1 text-white/90"
                />
                <input type="hidden" name="method" value="CASH" />
              </div>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowMovement(null)} className="px-3 py-2 text-sm text-white/70">Cancelar</button>
              <button disabled={loading} className={`px-4 py-2 rounded-lg font-semibold bg-gradient-to-r ${showMovement === "INCOME" ? "from-emerald-500 to-emerald-600" : "from-red-500 to-red-600"}`}>
                {loading ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal cierre */}
      {showClose && register && summary && (
        <Modal onClose={() => setShowClose(false)} title="Corte de caja" Icon={LockKeyhole} size="lg">
          <form onSubmit={closeRegister} className="grid gap-4">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                <p className="text-xs uppercase tracking-wide text-white/50">Rubro efectivo</p>
                <Stat label="Apertura" value={formatCurrency(Number(register.openingCash))} />
                <Stat label="Ventas en efectivo" value={formatCurrency(summary.cashSales)} />
                <Stat label="Ingresos de caja" value={formatCurrency(summary.incomes)} positive />
                <Stat label="Gastos de caja" value={formatCurrency(summary.expenses)} negative />
                <div className="pt-2 mt-2 border-t border-white/10">
                  <Stat label="Esperado en caja" value={formatCurrency(summary.expectedCash)} bold />
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                <p className="text-xs uppercase tracking-wide text-white/50">Otros medios de pago</p>
                <Stat label="Tarjeta" value={formatCurrency(summary.cardSales)} muted />
                <Stat label="Transferencia" value={formatCurrency(summary.transferSales)} muted />
                <Stat label="Crédito" value={formatCurrency(summary.creditSales)} muted />
                <div className="pt-2 mt-2 border-t border-white/10">
                  <Stat label="Ventas totales" value={formatCurrency(summary.totalSales)} bold />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-300/25 bg-amber-500/10 p-3">
              <p className="text-xs uppercase tracking-wide text-amber-200/80 mb-2">Validación de cierre</p>
              <div className="grid sm:grid-cols-[1fr_220px] gap-3 items-end">
                <div>
                  <label className="text-xs text-white/70" htmlFor="cl-cash">Efectivo contado</label>
                  <input
                    id="cl-cash"
                    required
                    type="number"
                    step="0.01"
                    name="closingCash"
                    value={closingCashInput}
                    onChange={(e) => setClosingCashInput(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/15 rounded-lg px-3 py-2 mt-1"
                  />
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2">
                  <p className="text-[11px] text-white/50 uppercase tracking-wide">Diferencia</p>
                  <p className={`text-lg font-bold ${closingDiffTone}`}>{closingDiffDisplay}</p>
                  <p className="text-xs text-white/60">{closingDiffLabel}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-white/60" htmlFor="cl-notes">Notas del cierre</label>
              <input id="cl-notes" name="notes" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 mt-1" placeholder="Ej. faltante por cambio, gastos pendientes..."/>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowClose(false)} className="px-3 py-2 text-sm text-white/70">Cancelar</button>
              <button disabled={loading} className="px-4 py-2 rounded-lg font-semibold bg-gradient-to-r from-amber-500 to-orange-600">
                {loading ? "Cerrando..." : "Cerrar caja"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Ticket última venta */}
      {lastSale && (
        <Modal onClose={() => setLastSale(null)} title="Venta registrada" Icon={Receipt}>
          <div className="text-center">
            <div className="text-4xl font-bold text-emerald-300">{formatCurrency(Number(lastSale.total))}</div>
            <p className="text-sm text-white/60 mt-1">{methodMeta[lastSale.method]?.label} · {lastSale.status === "CREDIT" ? "Crédito" : "Pagado"}</p>
            {lastSale.change > 0 && (
              <p className="mt-3 text-amber-300 font-semibold">Cambio: {formatCurrency(lastSale.change)}</p>
            )}
            <button onClick={() => setLastSale(null)} className="mt-5 w-full bg-gradient-to-r from-violet-500 to-fuchsia-600 py-2.5 rounded-lg font-semibold">
              Continuar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  children,
  onClose,
  title,
  Icon,
  size = "md",
}: Readonly<{
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  Icon: any;
  size?: "md" | "lg";
}>) {
  const sizeClass = size === "lg" ? "max-w-3xl" : "max-w-md";
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`bg-slate-900 border border-white/10 rounded-2xl w-full ${sizeClass} p-6 shadow-2xl`}>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center"><Icon size={18}/></div>
          <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-white/60 hover:text-white" aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  positive,
  negative,
  muted,
  bold,
}: Readonly<{
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
  muted?: boolean;
  bold?: boolean;
}>) {
  let cls = "text-white";
  if (positive) cls = "text-emerald-300";
  if (negative) cls = "text-red-300";
  if (muted) cls = "text-white/60";
  return (
    <div className="flex justify-between">
      <span className="text-white/50">{label}</span>
      <span className={`${cls} ${bold ? "font-bold" : ""}`}>{value}</span>
    </div>
  );
}
