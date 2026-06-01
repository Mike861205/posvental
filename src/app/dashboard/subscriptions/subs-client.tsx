"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

type Sub = {
  id: string; startDate: string; endDate: string; price: string | number; status: string;
  member: { id: string; fullName: string }; plan: { id: string; name: string };
};
type Member = { id: string; fullName: string };
type Plan = { id: string; name: string; price: string | number; durationDays: number };

export function SubsClient({ initialSubs, members, plans }: { initialSubs: Sub[]; members: Member[]; plans: Plan[] }) {
  const router = useRouter();
  const [subs] = useState(initialSubs);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suscripciones</h1>
          <p className="text-slate-500">Asigna planes a tus miembros y registra el cobro.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2"><Plus size={16}/> Nueva suscripción</button>
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
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-400">Aún no hay suscripciones.</td></tr>}
            {subs.map((s) => {
              const expired = new Date(s.endDate) < new Date();
              return (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{s.member.fullName}</td>
                  <td className="p-3">{s.plan.name}</td>
                  <td className="p-3">{formatDate(s.startDate)}</td>
                  <td className="p-3">{formatDate(s.endDate)}</td>
                  <td className="p-3">{formatCurrency(Number(s.price))}</td>
                  <td className="p-3">
                    {s.status === "CANCELED" ? <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">Cancelada</span>
                      : expired ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">Vencida</span>
                      : <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">Activa</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Nueva suscripción</h2>
            <form onSubmit={add} className="grid gap-3">
              <div>
                <label className="label">Miembro</label>
                <select required name="memberId" className="input">
                  <option value="">Selecciona...</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Plan</label>
                <select required name="planId" className="input">
                  <option value="">Selecciona...</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(Number(p.price))} / {p.durationDays}d</option>)}
                </select>
              </div>
              <div>
                <label className="label">Fecha de inicio</label>
                <input type="date" name="startDate" className="input" defaultValue={new Date().toISOString().slice(0,10)} />
              </div>
              <div>
                <label className="label">Método de pago</label>
                <select name="paymentMethod" className="input" defaultValue="CASH">
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
          </div>
        </div>
      )}
    </div>
  );
}
