"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, Lock, RefreshCcw, Save, StickyNote, Users, Wallet } from "lucide-react";

type TenantRow = {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
  createdAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
  isBlocked: boolean;
  blockedAt: string | null;
  blockReason: string | null;
  superadminNotes: string | null;
  accessUntil: string | null;
  monthlyFee: number | null;
  billingMethod: "TRANSFER" | "STRIPE";
  lastPaidAt: string | null;
  paidCycles: number;
  recentPayments: Array<{
    id: string;
    amount: number;
    method: "TRANSFER" | "STRIPE";
    paidAt: string;
    markedBy: string | null;
  }>;
  metrics: {
    membersCount: number;
    activeSubs: number;
    totalSubs: number;
    paymentsMonth: number;
    posSalesMonth: number;
    activityScore: number;
  };
};

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

function fmtDate(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function isCurrentMonth(date: Date) {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function daysUntil(v?: string | null) {
  if (!v) return null;
  const target = new Date(v);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.ceil((startTarget.getTime() - startToday.getTime()) / (1000 * 60 * 60 * 24));
}

export function SuperadminClient() {
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<"today" | "week" | "month" | "custom">("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [paymentNotes, setPaymentNotes] = useState<Record<string, string>>({});
  const [successByTenant, setSuccessByTenant] = useState<Record<string, string>>({});
  const [historyOpenByTenant, setHistoryOpenByTenant] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/superadmin/tenants", { cache: "no-store" });
      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (res.ok) {
        setRows(data?.tenants ?? []);
        if (data?.warning) {
          setMsg(data.warning);
        }
      } else {
        setMsg(data?.error ?? "No se pudo cargar información de tenants");
      }
    } catch {
      setMsg("Error de conexión al cargar tenants.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(dayStart);
    weekStart.setDate(dayStart.getDate() - dayStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const customStart = customFrom ? new Date(customFrom + "T00:00:00") : null;
    const customEnd = customTo ? new Date(customTo + "T23:59:59") : null;

    function inPeriod(dateValue?: string | null) {
      if (!dateValue) return false;
      const d = new Date(dateValue);
      if (Number.isNaN(d.getTime())) return false;

      if (period === "today") {
        return d >= dayStart;
      }
      if (period === "week") {
        return d >= weekStart;
      }
      if (period === "month") {
        return d >= monthStart;
      }
      if (!customStart && !customEnd) return true;
      if (customStart && d < customStart) return false;
      if (customEnd && d > customEnd) return false;
      return true;
    }

    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesText = !q || [r.name, r.city ?? "", r.phone ?? "", r.ownerEmail ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);

      const matchesDate = inPeriod(r.lastPaidAt) || inPeriod(r.accessUntil) || inPeriod(r.createdAt);
      return matchesText && matchesDate;
    });
  }, [rows, search, period, customFrom, customTo]);

  const dashboardTotals = useMemo(() => {
    const now = new Date();
    const activeTenants = filtered.filter((r) => {
      if (r.isBlocked || !r.accessUntil) return false;
      return new Date(r.accessUntil) >= now;
    }).length;

    const expiringSoon = filtered.filter((r) => {
      const diff = daysUntil(r.accessUntil);
      return diff !== null && diff >= 0 && diff <= 7;
    }).length;

    const expired = filtered.filter((r) => {
      const diff = daysUntil(r.accessUntil);
      return diff !== null && diff < 0;
    }).length;

    let monthlyPaymentsCount = 0;
    let monthlyPaymentsAmount = 0;
    filtered.forEach((r) => {
      r.recentPayments.forEach((p) => {
        const paidAt = new Date(p.paidAt);
        if (isCurrentMonth(paidAt)) {
          monthlyPaymentsCount += 1;
          monthlyPaymentsAmount += p.amount;
        }
      });
    });

    return {
      activeTenants,
      expiringSoon,
      expired,
      monthlyPaymentsCount,
      monthlyPaymentsAmount,
    };
  }, [filtered]);

  async function patchTenant(id: string, payload: Record<string, unknown>) {
    setSavingId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/superadmin/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;
      if (!res.ok) setMsg(data?.error ?? "No se pudo actualizar");
      else if (payload.action === "markPaid") {
        setMsg(`Pago registrado. Próximo vencimiento: ${fmtDate(data?.nextAccessUntil ?? null)}`);
        setSuccessByTenant((prev) => ({ ...prev, [id]: "Pago mensual aplicado" }));
      } else {
        setMsg("Cambios guardados correctamente.");
        setSuccessByTenant((prev) => ({ ...prev, [id]: "Meta guardada" }));
      }
      await load();
    } catch {
      setMsg("Error al actualizar tenant.");
      setSavingId(null);
    }
    setSavingId(null);
  }

  async function resetPassword(id: string) {
    const password = passwords[id]?.trim();
    if (!password) {
      setMsg("Ingresa una contraseña nueva para el tenant.");
      return;
    }
    setSavingId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/superadmin/tenants/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;
      if (!res.ok) setMsg(data?.error ?? "No se pudo resetear contraseña");
      else {
        setMsg("Contraseña actualizada correctamente.");
        setPasswords((prev) => ({ ...prev, [id]: "" }));
        setSuccessByTenant((prev) => ({ ...prev, [id]: "Contraseña actualizada" }));
      }
    } catch {
      setMsg("Error al resetear contraseña.");
    }
    setSavingId(null);
  }

  async function logout() {
    await fetch("/api/superadmin/logout", { method: "POST" });
    window.location.href = "/superadmin/login";
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-900 to-cyan-900 p-6 text-white shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">SuperAdmin de Tenants</h1>
              <p className="text-sm text-white/80">Gestión de altas, actividad, cobros y estado del sistema por tenant.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => void load()} className="btn bg-white/15 text-white hover:bg-white/25">
                <RefreshCcw size={16} /> Refrescar
              </button>
              <button onClick={logout} className="btn bg-rose-600 text-white hover:bg-rose-700">
                Salir
              </button>
            </div>
          </div>
        </header>

        <section className="card p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="input max-w-md"
              placeholder="Buscar tenant por nombre, ciudad o teléfono"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPeriod("today")}
                className={`btn ${period === "today" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200"}`}
              >
                Hoy
              </button>
              <button
                onClick={() => setPeriod("week")}
                className={`btn ${period === "week" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200"}`}
              >
                Semana
              </button>
              <button
                onClick={() => setPeriod("month")}
                className={`btn ${period === "month" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200"}`}
              >
                Mes
              </button>
              <button
                onClick={() => setPeriod("custom")}
                className={`btn ${period === "custom" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200"}`}
              >
                Personalizado
              </button>
            </div>
            {period === "custom" && (
              <div className="flex items-center gap-2">
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="input" />
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="input" />
              </div>
            )}
            <div className="text-sm text-slate-600">Tenants: <strong>{filtered.length}</strong></div>
          </div>
          {msg && <p className="mt-3 text-sm text-indigo-700">{msg}</p>}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="card p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Tenants activos</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{dashboardTotals.activeTenants}</p>
            <p className="text-xs text-slate-500">Con acceso vigente y sin bloqueo</p>
          </div>
          <div className="card p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Pagos del mes</p>
            <p className="mt-1 text-2xl font-bold text-sky-700">{dashboardTotals.monthlyPaymentsCount}</p>
            <p className="text-xs text-slate-500">Monto: {fmtCurrency(dashboardTotals.monthlyPaymentsAmount)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Por vencer</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{dashboardTotals.expiringSoon}</p>
            <p className="text-xs text-slate-500">Vencen en los próximos 7 días</p>
          </div>
          <div className="card p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Vencidos</p>
            <p className="mt-1 text-2xl font-bold text-rose-600">{dashboardTotals.expired}</p>
            <p className="text-xs text-slate-500">Requieren cobro y reactivación</p>
          </div>
        </section>

        {loading ? (
          <section className="card p-6 text-slate-500">Cargando tenants...</section>
        ) : (
          <div className="grid gap-4">
            {filtered.map((t) => {
              const isSaving = savingId === t.id;
              return (
                <article key={t.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{t.name}</h2>
                      <p className="text-sm text-slate-500">
                        Ciudad: {t.city || "-"} | Teléfono: {t.phone || "-"} | Registro: {fmtDate(t.createdAt)}
                      </p>
                      <p className="text-sm text-slate-500">
                        Responsable: {t.ownerName || "-"} | Email: {t.ownerEmail || "-"}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${t.isBlocked ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {t.isBlocked ? "Bloqueado" : "Activo"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-5">
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Miembros</p><p className="text-lg font-bold">{t.metrics.membersCount}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Subs activas</p><p className="text-lg font-bold">{t.metrics.activeSubs}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Subs totales</p><p className="text-lg font-bold">{t.metrics.totalSubs}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Pagos mes</p><p className="text-lg font-bold">{fmtCurrency(t.metrics.paymentsMonth)}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">POS mes</p><p className="text-lg font-bold">{fmtCurrency(t.metrics.posSalesMonth)}</p></div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="label">Vence acceso del tenant</label>
                      <input
                        type="date"
                        className="input"
                        defaultValue={t.accessUntil ? new Date(t.accessUntil).toISOString().slice(0, 10) : ""}
                        onChange={(e) => {
                          setRows((prev) => prev.map((r) => r.id === t.id ? { ...r, accessUntil: e.target.value || null } : r));
                        }}
                      />
                    </div>
                    <div>
                      <label className="label">Cuota mensual MXN</label>
                      <input
                        type="number"
                        step="0.01"
                        className="input"
                        defaultValue={t.monthlyFee ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRows((prev) => prev.map((r) => r.id === t.id ? { ...r, monthlyFee: val ? Number(val) : null } : r));
                        }}
                      />
                    </div>
                    <div>
                      <label className="label">Método de cobro</label>
                      <select
                        className="input"
                        defaultValue={t.billingMethod}
                        onChange={(e) => {
                          const value = e.target.value as "TRANSFER" | "STRIPE";
                          setRows((prev) => prev.map((r) => r.id === t.id ? { ...r, billingMethod: value } : r));
                        }}
                      >
                        <option value="TRANSFER">Transferencia</option>
                        <option value="STRIPE">Stripe</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Nueva contraseña OWNER</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="input"
                          value={passwords[t.id] ?? ""}
                          onChange={(e) => setPasswords((prev) => ({ ...prev, [t.id]: e.target.value }))}
                          placeholder="Mín. 6 caracteres"
                        />
                        <button onClick={() => void resetPassword(t.id)} disabled={isSaving} className="btn-ghost whitespace-nowrap">
                          <Lock size={15} /> Reset
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    Último pago: {fmtDate(t.lastPaidAt)} | Ciclos pagados: {t.paidCycles}
                  </div>

                  <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    Próximo vencimiento: <strong>{fmtDate(t.accessUntil)}</strong>
                    {(() => {
                      const diff = daysUntil(t.accessUntil);
                      if (diff === null) return " | Sin fecha";
                      if (diff < 0) return ` | Vencido hace ${Math.abs(diff)} día(s)`;
                      if (diff === 0) return " | Vence hoy";
                      return ` | Faltan ${diff} día(s)`;
                    })()}
                  </div>

                  <div className="mt-3">
                    <label className="label">Nota de pago mensual</label>
                    <input
                      className="input"
                      value={paymentNotes[t.id] ?? ""}
                      onChange={(e) => setPaymentNotes((prev) => ({ ...prev, [t.id]: e.target.value }))}
                      placeholder="Ej: Transferencia comprobante #123"
                    />
                  </div>

                  <div className="mt-3">
                    <label className="label">Notas internas</label>
                    <textarea
                      className="input"
                      rows={2}
                      defaultValue={t.superadminNotes ?? ""}
                      onChange={(e) => {
                        setRows((prev) => prev.map((r) => r.id === t.id ? { ...r, superadminNotes: e.target.value } : r));
                      }}
                      placeholder="Notas administrativas del tenant"
                    />
                  </div>

                  {t.isBlocked && (
                    <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      Motivo de bloqueo: {t.blockReason || "No especificado"}. Fecha: {fmtDate(t.blockedAt)}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => void patchTenant(t.id, {
                        action: "saveMeta",
                        superadminNotes: t.superadminNotes ?? "",
                        accessUntil: t.accessUntil ? new Date(t.accessUntil).toISOString() : "",
                        monthlyFee: t.monthlyFee,
                        billingMethod: t.billingMethod,
                      })}
                      disabled={isSaving}
                      className="btn-primary"
                    >
                      <Save size={15} /> Guardar meta
                    </button>

                    <button
                      onClick={() => void patchTenant(t.id, {
                        action: "markPaid",
                        monthlyFee: t.monthlyFee ?? 0,
                        billingMethod: t.billingMethod,
                        paymentNote: paymentNotes[t.id] ?? "",
                      })}
                      disabled={isSaving}
                      className="btn rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                    >
                      <Wallet size={15} /> Marcar pagado (+30 días)
                    </button>

                    <button
                      onClick={() => {
                        const reason = window.prompt("Motivo de bloqueo", t.blockReason ?? "Falta de pago");
                        if (reason === null) return;
                        void patchTenant(t.id, { action: "block", blockReason: reason });
                      }}
                      disabled={isSaving || t.isBlocked}
                      className="btn rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      <Ban size={15} /> Bloquear sistema
                    </button>

                    <button
                      onClick={() => void patchTenant(t.id, { action: "activate" })}
                      disabled={isSaving || !t.isBlocked}
                      className="btn rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 size={15} /> Activar sistema
                    </button>

                    <span className="ml-auto inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">
                      <Users size={14} /> Actividad: {t.metrics.activityScore}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700">
                      <StickyNote size={14} /> ID: {t.id}
                    </span>
                  </div>

                  {successByTenant[t.id] && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                      {successByTenant[t.id]}
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                    <button
                      type="button"
                      className="w-full text-left text-sm font-semibold text-slate-800"
                      onClick={() => setHistoryOpenByTenant((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}
                    >
                      Historial de cobros ({t.recentPayments.length}) {historyOpenByTenant[t.id] ? "▲" : "▼"}
                    </button>

                    {historyOpenByTenant[t.id] && (
                      <>
                        {t.recentPayments.length === 0 ? (
                          <p className="mt-2 text-sm text-slate-500">Sin cobros registrados aún.</p>
                        ) : (
                          <div className="mt-2 overflow-x-auto">
                            <table className="w-full min-w-[520px] text-sm">
                              <thead>
                                <tr className="text-left text-slate-500">
                                  <th className="py-2 pr-3">Fecha</th>
                                  <th className="py-2 pr-3">Monto</th>
                                  <th className="py-2 pr-3">Método</th>
                                  <th className="py-2 pr-3">Marcado por</th>
                                </tr>
                              </thead>
                              <tbody>
                                {t.recentPayments.map((p) => (
                                  <tr key={p.id} className="border-t border-slate-100 text-slate-700">
                                    <td className="py-2 pr-3">{fmtDate(p.paidAt)}</td>
                                    <td className="py-2 pr-3 font-semibold">{fmtCurrency(p.amount)}</td>
                                    <td className="py-2 pr-3">{p.method === "STRIPE" ? "Stripe" : "Transferencia"}</td>
                                    <td className="py-2 pr-3">{p.markedBy ?? "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
            {filtered.length === 0 && (
              <section className="card p-6 text-slate-500">Sin resultados para tu búsqueda.</section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
