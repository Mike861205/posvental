"use client";
import { useState } from "react";
import { Calendar, ChevronDown, FileSpreadsheet, FileText, X } from "lucide-react";

export type DateRange = { from: Date | null; to: Date | null };
export type FilterPreset = "all" | "today" | "week" | "month" | "custom";

export function getDateRange(preset: FilterPreset, custom: DateRange): DateRange {
  const now = new Date();
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
  if (preset === "today") return { from: startOfDay(now), to: endOfDay(now) };
  if (preset === "week") {
    const from = new Date(now); from.setDate(now.getDate() - now.getDay());
    return { from: startOfDay(from), to: endOfDay(now) };
  }
  if (preset === "month") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
  }
  if (preset === "custom") return custom;
  return { from: null, to: null };
}

export function filterByDate<T extends Record<string, unknown>>(
  items: T[], range: DateRange, dateKey: string,
): T[] {
  if (!range.from && !range.to) return items;
  return items.filter((item) => {
    const d = new Date(item[dateKey] as string);
    if (range.from && d < range.from) return false;
    if (range.to && d > range.to) return false;
    return true;
  });
}

interface DateFilterBarProps {
  preset: FilterPreset;
  setPreset: (p: FilterPreset) => void;
  custom: DateRange;
  setCustom: (r: DateRange) => void;
  resultCount: number;
  onExportExcel: () => void;
  onExportPDF: () => void;
}

const PRESETS: { value: FilterPreset; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "custom", label: "Rango..." },
];

export function DateFilterBar({
  preset, setPreset, custom, setCustom, resultCount, onExportExcel, onExportPDF,
}: DateFilterBarProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [tmpFrom, setTmpFrom] = useState(custom.from?.toISOString().slice(0, 10) ?? "");
  const [tmpTo, setTmpTo] = useState(custom.to?.toISOString().slice(0, 10) ?? "");

  function applyCustom() {
    if (!tmpFrom || !tmpTo) return;
    const from = new Date(tmpFrom + "T00:00:00");
    const to = new Date(tmpTo + "T23:59:59");
    setCustom({ from, to });
    setPreset("custom");
    setShowCustom(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset pills */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
        <Calendar size={14} className="text-slate-500 ml-1" />
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => {
              if (p.value === "custom") { setShowCustom(true); }
              else { setPreset(p.value); setShowCustom(false); }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${preset === p.value && p.value !== "custom"
                ? "bg-white shadow text-violet-700 font-semibold"
                : preset === "custom" && p.value === "custom"
                ? "bg-white shadow text-violet-700 font-semibold"
                : "text-slate-600 hover:text-slate-900"}`}
          >
            {p.value === "custom" && preset === "custom"
              ? <span className="flex items-center gap-1">
                  {tmpFrom} → {tmpTo}
                  <span className="ml-1 text-slate-400">{<ChevronDown size={10}/>}</span>
                </span>
              : p.label}
          </button>
        ))}
      </div>

      {/* Result count */}
      <span className="text-xs text-slate-500 px-2">
        {resultCount} resultado{resultCount !== 1 ? "s" : ""}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export buttons */}
      <button
        onClick={onExportExcel}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors"
      >
        <FileSpreadsheet size={14} />
        Excel
      </button>
      <button
        onClick={onExportPDF}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors"
      >
        <FileText size={14} />
        PDF
      </button>

      {/* Custom range popup */}
      {showCustom && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowCustom(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Rango personalizado</h3>
              <button onClick={() => setShowCustom(false)} className="text-slate-400 hover:text-slate-700"><X size={16}/></button>
            </div>
            <div className="grid gap-3">
              <div>
                <label className="label mb-1">Desde</label>
                <input type="date" className="input" value={tmpFrom} onChange={(e) => setTmpFrom(e.target.value)} />
              </div>
              <div>
                <label className="label mb-1">Hasta</label>
                <input type="date" className="input" value={tmpTo} onChange={(e) => setTmpTo(e.target.value)} />
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setShowCustom(false)} className="btn-ghost flex-1">Cancelar</button>
                <button onClick={applyCustom} className="btn-primary flex-1">Aplicar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
