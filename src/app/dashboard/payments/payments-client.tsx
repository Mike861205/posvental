"use client";
import { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DateFilterBar, DateRange, FilterPreset, getDateRange, filterByDate } from "@/components/date-filter-bar";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";

type Payment = {
  id: string;
  amount: string | number;
  method: string;
  status: string;
  createdAt: string;
  subscription: {
    member: { fullName: string };
    plan: { name: string };
  } | null;
};

const STATUS_LABEL: Record<string, string> = {
  PAID: "Pagado",
  PENDING: "Pendiente",
  FAILED: "Fallido",
};

export function PaymentsClient({ payments }: { payments: Payment[] }) {
  const [preset, setPreset] = useState<FilterPreset>("all");
  const [custom, setCustom] = useState<DateRange>({ from: null, to: null });

  const filtered = useMemo(() => {
    const range = getDateRange(preset, custom);
    return filterByDate(payments as unknown as Record<string, unknown>[], range, "createdAt") as unknown as Payment[];
  }, [payments, preset, custom]);

  const totalPaid = useMemo(
    () => filtered.filter((p) => p.status === "PAID").reduce((s, p) => s + Number(p.amount), 0),
    [filtered],
  );

  const COLUMNS = [
    { header: "Fecha", key: "createdAt" },
    { header: "Miembro", key: "member" },
    { header: "Plan", key: "plan" },
    { header: "Método", key: "method" },
    { header: "Importe", key: "amount" },
    { header: "Estado", key: "status" },
  ];

  function exportRows() {
    return filtered.map((p) => ({
      createdAt: formatDate(p.createdAt),
      member: p.subscription?.member.fullName ?? "—",
      plan: p.subscription?.plan.name ?? "—",
      method: p.method,
      amount: formatCurrency(Number(p.amount)),
      status: STATUS_LABEL[p.status] ?? p.status,
    }));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Pagos</h1>
        <p className="text-slate-500">Historial de cobros registrados.</p>
      </div>

      <DateFilterBar
        preset={preset} setPreset={setPreset}
        custom={custom} setCustom={setCustom}
        resultCount={filtered.length}
        onExportExcel={() => exportToExcel(exportRows(), COLUMNS, "pagos")}
        onExportPDF={() => exportToPDF(exportRows(), COLUMNS, "pagos", "Historial de Pagos")}
      />

      {/* Resumen */}
      <div className="flex gap-4 flex-wrap">
        <div className="card px-5 py-3 flex items-center gap-3">
          <span className="text-sm text-slate-500">Total cobrado (filtro):</span>
          <span className="text-lg font-bold text-emerald-600">{formatCurrency(totalPaid)}</span>
        </div>
        <div className="card px-5 py-3 flex items-center gap-3">
          <span className="text-sm text-slate-500">Transacciones:</span>
          <span className="text-lg font-bold">{filtered.length}</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Fecha</th>
              <th className="text-left p-3">Miembro</th>
              <th className="text-left p-3">Plan</th>
              <th className="text-left p-3">Método</th>
              <th className="text-left p-3">Importe</th>
              <th className="text-left p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-400">Sin resultados para el período seleccionado.</td></tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-3 text-slate-600">{formatDate(p.createdAt)}</td>
                <td className="p-3 font-medium">{p.subscription?.member.fullName ?? "—"}</td>
                <td className="p-3">{p.subscription?.plan.name ?? "—"}</td>
                <td className="p-3 text-slate-600">{p.method}</td>
                <td className="p-3 font-semibold">{formatCurrency(Number(p.amount))}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.status === "PAID" ? "bg-emerald-100 text-emerald-700"
                    : p.status === "PENDING" ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
