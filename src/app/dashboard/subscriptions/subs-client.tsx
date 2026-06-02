"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { DateFilterBar, DateRange, FilterPreset, getDateRange, filterByDate } from "@/components/date-filter-bar";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";

type Sub = {
  id: string; startDate: string; endDate: string; price: string | number; status: string;
  createdAt: string;
  member: { id: string; fullName: string }; plan: { id: string; name: string };
};
type Member = { id: string; fullName: string };
type Plan = { id: string; name: string; price: string | number; durationDays: number };
type PaymentMethod = "CASH" | "STRIPE" | "MERCADOPAGO" | "TRANSFER" | "OTHER";
type StatusFilter = "all" | "active" | "expiring" | "expired" | "canceled";

export function SubsClient({
  initialSubs, members, plans, initialFilter = "all", warnDays = 7,
}: Readonly<{
  initialSubs: Sub[]; members: Member[]; plans: Plan[];
  initialFilter?: string; warnDays?: number;
}>) {
  const router = useRouter();
  const [subs] = useState(initialSubs);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [openPlanModal, setOpenPlanModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Sub | null>(null);
  const [nextPlanId, setNextPlanId] = useState("");
  const [registerPayment, setRegisterPayment] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [preset, setPreset] = useState<FilterPreset>("all");
  const [custom, setCustom] = useState<DateRange>({ from: null, to: null });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilter as StatusFilter);

  const filtered = useMemo(() => {
    const now = new Date();
    const warnDate = new Date(now.getTime() + warnDays * 24 * 60 * 60 * 1000);
    const range = getDateRange(preset, custom);
    const byDate = filterByDate(subs as unknown as Record<string, unknown>[], range, "startDate") as unknown as Sub[];

    return byDate.filter((s) => {
      const end = new Date(s.endDate);
      if (statusFilter === "active") return s.status === "ACTIVE" && end >= now;
      if (statusFilter === "expiring") return s.status === "ACTIVE" && end >= now && end <= warnDate;
      if (statusFilter === "expired") return s.status !== "CANCELED" && end < now;
      if (statusFilter === "canceled") return s.status === "CANCELED";
      return true;
    });
  }, [subs, preset, custom, statusFilter, warnDays]);

  const COLUMNS = [
    { header: "Miembro", key: "member" },
    { header: "Plan", key: "plan" },
    { header: "Inicio", key: "startDate" },
    { header: "Vence", key: "endDate" },
    { header: "Precio", key: "price" },
    { header: "Estado", key: "status" },
  ];

  function exportRows() {
    return filtered.map((s) => ({
      member: s.member.fullName,
      plan: s.plan.name,
      startDate: formatDate(s.startDate),
      endDate: formatDate(s.endDate),
      price: formatCurrency(Number(s.price)),
      status: getStatusMeta(s).label,
    }));
  }

  function getStatusMeta(s: Sub) {
    const now = new Date();
    const end = new Date(s.endDate);
    const warnDate = new Date(now.getTime() + warnDays * 24 * 60 * 60 * 1000);

    if (s.status === "CANCELED") {
      return { label: "Cancelada", cls: "bg-slate-100 text-slate-700" };
    }
    if (end < now) {
      return { label: "Mora", cls: "bg-red-100 text-red-700" };
    }
    if (end <= warnDate) {
      return { label: "Por vencer", cls: "bg-amber-100 text-amber-700" };
    }
    return { label: "Activa", cls: "bg-emerald-100 text-emerald-700" };
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/subscriptions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setLoading(false);
    if (res.ok) { setOpen(false); router.refresh(); }
  }

  async function markPaid(subId: string) {
    setActionLoadingId(subId);
    const res = await fetch(`/api/subscriptions/${subId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markPaid", paymentMethod }),
    });
    setActionLoadingId(null);
    if (res.ok) router.refresh();
  }

  function openChangePlan(sub: Sub) {
    setSelectedSub(sub);
    setNextPlanId(sub.plan.id);
    setRegisterPayment(true);
    setPaymentMethod("CASH");
    setOpenPlanModal(true);
  }

  async function submitChangePlan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSub || !nextPlanId) return;

    setActionLoadingId(selectedSub.id);
    const res = await fetch(`/api/subscriptions/${selectedSub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "changePlan",
        planId: nextPlanId,
        registerPayment,
        paymentMethod,
      }),
    });
    setActionLoadingId(null);

    if (res.ok) {
      setOpenPlanModal(false);
      setSelectedSub(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suscripciones</h1>
          <p className="text-slate-500">Asigna planes a tus miembros y registra el cobro.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2"><Plus size={16}/> Nueva suscripción</button>
      </div>

      <DateFilterBar
        preset={preset} setPreset={setPreset}
        custom={custom} setCustom={setCustom}
        resultCount={filtered.length}
        onExportExcel={() => exportToExcel(exportRows(), COLUMNS, "suscripciones")}
        onExportPDF={() => exportToPDF(exportRows(), COLUMNS, "suscripciones", "Listado de Suscripciones")}
      />

      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "Todas" },
          { key: "active", label: "Activas" },
          { key: "expiring", label: `Por vencer (${warnDays}d)` },
          { key: "expired", label: "Mora" },
          { key: "canceled", label: "Canceladas" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key as StatusFilter)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              statusFilter === key
                ? "bg-violet-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {label}
            {statusFilter === key && key !== "all" && (
              <X size={12} className="inline ml-1" onClick={(e) => { e.stopPropagation(); setStatusFilter("all"); }} />
            )}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Miembro</th>
              <th className="text-left p-3">Plan</th>
              <th className="text-left p-3">Inicio</th>
              <th className="text-left p-3">Vence</th>
              <th className="text-left p-3">Precio</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-left p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-400">Sin resultados para el período seleccionado.</td></tr>}
            {filtered.map((s) => {
              const status = getStatusMeta(s);
              return (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-medium">{s.member.fullName}</td>
                  <td className="p-3">{s.plan.name}</td>
                  <td className="p-3">{formatDate(s.startDate)}</td>
                  <td className="p-3">{formatDate(s.endDate)}</td>
                  <td className="p-3">{formatCurrency(Number(s.price))}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>{status.label}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => markPaid(s.id)}
                        disabled={actionLoadingId === s.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-60"
                      >
                        {actionLoadingId === s.id ? "Procesando..." : "Marcar pagado"}
                      </button>
                      <button
                        onClick={() => openChangePlan(s)}
                        disabled={actionLoadingId === s.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 disabled:opacity-60"
                      >
                        Cambiar plan
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <dialog open className="card w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Nueva suscripción</h2>
            <form onSubmit={add} className="grid gap-3">
              <div>
                <label htmlFor="new-sub-member" className="label">Miembro</label>
                <select id="new-sub-member" required name="memberId" className="input">
                  <option value="">Selecciona...</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="new-sub-plan" className="label">Plan</label>
                <select id="new-sub-plan" required name="planId" className="input">
                  <option value="">Selecciona...</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(Number(p.price))} / {p.durationDays}d</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="new-sub-start" className="label">Fecha de inicio</label>
                <input id="new-sub-start" type="date" name="startDate" className="input" defaultValue={new Date().toISOString().slice(0,10)} />
              </div>
              <div>
                <label htmlFor="new-sub-method" className="label">Método de pago</label>
                <select id="new-sub-method" name="paymentMethod" className="input" defaultValue="CASH">
                  <option value="CASH">Efectivo</option>
                  <option value="STRIPE">Stripe</option>
                  <option value="MERCADOPAGO">Mercado Pago</option>
                  <option value="TRANSFER">Transferencia</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
                <button disabled={loading} className="btn-primary">{loading ? "Guardando..." : "Crear"}</button>
              </div>
            </form>
          </dialog>
        </div>
      )}

      {openPlanModal && selectedSub && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <dialog open className="card w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-1">Cambiar plan</h2>
            <p className="text-sm text-slate-500 mb-4">Miembro: {selectedSub.member.fullName}</p>

            <form onSubmit={submitChangePlan} className="grid gap-3">
              <div>
                <label htmlFor="change-plan-select" className="label">Nuevo plan</label>
                <select id="change-plan-select" required value={nextPlanId} onChange={(e) => setNextPlanId(e.target.value)} className="input">
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(Number(p.price))} / {p.durationDays}d
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="change-plan-method" className="label">Método de pago</label>
                <select id="change-plan-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="input">
                  <option value="CASH">Efectivo</option>
                  <option value="STRIPE">Stripe</option>
                  <option value="MERCADOPAGO">Mercado Pago</option>
                  <option value="TRANSFER">Transferencia</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={registerPayment}
                  onChange={(e) => setRegisterPayment(e.target.checked)}
                />
                <span>Registrar pago al aplicar el cambio</span>
              </label>

              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setOpenPlanModal(false)} className="btn-ghost">Cancelar</button>
                <button disabled={actionLoadingId === selectedSub.id} className="btn-primary">
                  {actionLoadingId === selectedSub.id ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </dialog>
        </div>
      )}
    </div>
  );
}


