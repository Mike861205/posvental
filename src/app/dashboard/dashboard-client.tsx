"use client";
import { useState, useMemo } from "react";
import { Calendar, ChevronDown, Users, CreditCard, AlertTriangle, DollarSign, Store } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { RevenueChart } from "./revenue-chart";

type FilterPreset = "all" | "today" | "week" | "month" | "custom";
type DateRange = { from: Date | null; to: Date | null };

type RawMember = { createdAt: string };
type RawSub = { startDate: string; endDate: string; status: string };
type RawPayment = { amount: number; createdAt: string };
type RawPosSale = { total: number; createdAt: string };

function getRange(preset: FilterPreset, custom: DateRange): DateRange {
  const now = new Date();
  const sod = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const eod = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
  if (preset === "today") return { from: sod(now), to: eod(now) };
  if (preset === "week") {
    const from = new Date(now); from.setDate(now.getDate() - 6);
    return { from: sod(from), to: eod(now) };
  }
  if (preset === "month") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: eod(now) };
  if (preset === "custom") return custom;
  return { from: null, to: null };
}

function withinRange(dateStr: string, range: DateRange) {
  const d = new Date(dateStr);
  if (range.from && d < range.from) return false;
  if (range.to && d > range.to) return false;
  return true;
}

const PRESETS: { value: FilterPreset; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "today", label: "Hoy" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "custom", label: "Rango" },
];

export function DashboardClient({
  members, subscriptions, payments, posSales, warnDays, expiringSoon,
}: Readonly<{
  members: RawMember[];
  subscriptions: RawSub[];
  payments: RawPayment[];
  posSales: RawPosSale[];
  warnDays: number;
  expiringSoon: number;
}>) {
  const [preset, setPreset] = useState<FilterPreset>("month");
  const [custom, setCustom] = useState<DateRange>({ from: null, to: null });
  const [showCustom, setShowCustom] = useState(false);
  const [tmpFrom, setTmpFrom] = useState("");
  const [tmpTo, setTmpTo] = useState("");

  const range = useMemo(() => getRange(preset, custom), [preset, custom]);

  const membersCount = useMemo(
    () => members.filter((m) => withinRange(m.createdAt, range)).length,
    [members, range],
  );

  const activeSubs = useMemo(() => {
    const now = new Date();
    return subscriptions.filter(
      (s) => s.status === "ACTIVE" && new Date(s.endDate) >= now && withinRange(s.startDate, range),
    ).length;
  }, [subscriptions, range]);

  const filteredPayments = useMemo(
    () => payments.filter((p) => withinRange(p.createdAt, range)),
    [payments, range],
  );

  const subscriptionRevenue = useMemo(
    () => filteredPayments.reduce((acc, p) => acc + Number(p.amount), 0),
    [filteredPayments],
  );

  const filteredPosSales = useMemo(
    () => posSales.filter((sale) => withinRange(sale.createdAt, range)),
    [posSales, range],
  );

  const posRevenue = useMemo(
    () => filteredPosSales.reduce((acc, sale) => acc + Number(sale.total), 0),
    [filteredPosSales],
  );

  const totalRevenue = subscriptionRevenue + posRevenue;

  const chartData = useMemo(() => {
    const now = new Date();
    const buckets: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets[d.toLocaleDateString("es-MX", { month: "short" })] = 0;
    }
    for (const p of filteredPayments) {
      const k = new Date(p.createdAt).toLocaleDateString("es-MX", { month: "short" });
      if (k in buckets) buckets[k] += Number(p.amount);
    }
    for (const sale of filteredPosSales) {
      const k = new Date(sale.createdAt).toLocaleDateString("es-MX", { month: "short" });
      if (k in buckets) buckets[k] += Number(sale.total);
    }
    return Object.entries(buckets).map(([month, total]) => ({ month, total }));
  }, [filteredPayments, filteredPosSales]);

  function applyCustom() {
    if (!tmpFrom || !tmpTo) return;
    setCustom({ from: new Date(tmpFrom + "T00:00:00"), to: new Date(tmpTo + "T23:59:59") });
    setPreset("custom");
    setShowCustom(false);
  }

  const customLabel =
    preset === "custom" && custom.from && custom.to
      ? `${custom.from.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })} – ${custom.to.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}`
      : "Rango";

  const cards = [
    {
      label: preset === "all" ? "Miembros" : "Nuevos miembros",
      value: membersCount,
      Icon: Users,
      gradient: "bg-gradient-violet",
      href: "/dashboard/members",
    },
    {
      label: preset === "all" ? "Suscripciones activas" : "Suscripciones nuevas",
      value: activeSubs,
      Icon: CreditCard,
      gradient: "bg-gradient-blue",
      href: "/dashboard/subscriptions",
    },
    {
      label: `Por vencer (${warnDays}d)`,
      value: expiringSoon,
      Icon: AlertTriangle,
      gradient: "bg-gradient-amber",
      href: "/dashboard/subscriptions?filter=expiring",
    },
    {
      label: "Ingresos por suscripciones",
      value: formatCurrency(subscriptionRevenue),
      Icon: DollarSign,
      gradient: "bg-gradient-emerald",
      href: "/dashboard/payments",
    },
    {
      label: "Ingresos punto de venta",
      value: formatCurrency(posRevenue),
      Icon: Store,
      gradient: "bg-gradient-blue",
      href: "/dashboard/pos",
    },
    {
      label: "Ingresos totales",
      value: formatCurrency(totalRevenue),
      Icon: DollarSign,
      gradient: "bg-gradient-amber",
      href: "/dashboard/payments",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header + filtros */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-slate-500">Resumen general de tu negocio.</p>
        </div>

        <div className="sm:ml-auto flex flex-col items-start sm:items-end gap-3">
          {/* Pill bar */}
          <div className="flex items-center gap-1 bg-white/80 backdrop-blur border border-slate-200/80 shadow-md p-1.5 rounded-2xl">
            <Calendar size={14} className="text-violet-400 ml-1 shrink-0" />
            {PRESETS.map((p) => {
              const isActive = preset === p.value;
              const label = p.value === "custom" ? customLabel : p.label;
              return (
                <button
                  key={p.value}
                  onClick={() => {
                    if (p.value === "custom") {
                      setShowCustom((v) => !v);
                    } else {
                      setPreset(p.value);
                      setShowCustom(false);
                    }
                  }}
                  className={`
                    relative px-3.5 py-2 rounded-xl text-xs font-semibold
                    transition-all duration-200 ease-out whitespace-nowrap
                    flex items-center gap-1
                    ${isActive
                      ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-300/50 scale-[1.06]"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}
                  `}
                >
                  {label}
                  {p.value === "custom" && (
                    <ChevronDown
                      size={10}
                      className={`transition-transform duration-200 ${showCustom ? "rotate-180" : ""}`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom range picker */}
          {showCustom && (
            <div className="bg-white border border-slate-200 shadow-2xl shadow-slate-200/60 rounded-2xl p-5 flex flex-col gap-4 w-72 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Calendar size={13} className="text-violet-600" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Rango personalizado</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block font-medium">Desde</label>
                  <input
                    type="date"
                    value={tmpFrom}
                    onChange={(e) => setTmpFrom(e.target.value)}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block font-medium">Hasta</label>
                  <input
                    type="date"
                    value={tmpTo}
                    onChange={(e) => setTmpTo(e.target.value)}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowCustom(false)}
                  className="flex-1 btn-ghost text-xs py-2"
                >
                  Cancelar
                </button>
                <button
                  onClick={applyCustom}
                  disabled={!tmpFrom || !tmpTo}
                  className="flex-1 btn-primary text-xs py-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`${c.gradient} rounded-2xl p-5 text-white shadow-lg hover:opacity-90 hover:scale-[1.02] transition-all cursor-pointer`}
          >
            <div className="flex items-center justify-between">
              <p className="text-white/80 text-sm">{c.label}</p>
              <c.Icon size={20} className="opacity-80" />
            </div>
            <p className="mt-3 text-3xl font-bold">{c.value}</p>
          </Link>
        ))}
      </div>

      {/* Gráfica */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Ingresos últimos 6 meses</h2>
        <RevenueChart data={chartData} />
      </div>
    </div>
  );
}
