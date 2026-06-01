"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

type Plan = { id: string; name: string; description: string | null; price: string | number; durationDays: number; active: boolean };

const gradients = ["bg-gradient-violet", "bg-gradient-blue", "bg-gradient-emerald", "bg-gradient-amber"];

export function PlansClient({ initialPlans }: { initialPlans: Plan[] }) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/plans", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setLoading(false);
    if (res.ok) { setOpen(false); router.refresh(); }
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar plan?")) return;
    const res = await fetch(`/api/plans/${id}`, { method: "DELETE" });
    if (res.ok) setPlans((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Planes / Suscripciones</h1>
          <p className="text-slate-500">Zumba, Gym, CrossFit, JumpiFit y más.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2"><Plus size={16}/> Nuevo plan</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {plans.length === 0 && <p className="text-slate-400">Aún no hay planes.</p>}
        {plans.map((p, i) => (
          <div key={p.id} className={`${gradients[i % gradients.length]} rounded-2xl p-6 text-white shadow-lg relative`}>
            <button onClick={() => remove(p.id)} className="absolute top-3 right-3 text-white/70 hover:text-white"><Trash2 size={16}/></button>
            <p className="text-white/80 text-sm">Plan</p>
            <h3 className="text-2xl font-bold">{p.name}</h3>
            {p.description && <p className="text-white/80 mt-1 text-sm">{p.description}</p>}
            <p className="mt-6 text-4xl font-bold">{formatCurrency(Number(p.price))}</p>
            <p className="text-white/80 text-sm">por {p.durationDays} días</p>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Nuevo plan</h2>
            <form onSubmit={add} className="grid gap-3">
              <div><label className="label">Nombre</label><input required name="name" className="input" placeholder="Zumba mensual"/></div>
              <div><label className="label">Descripción</label><textarea name="description" className="input"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Precio</label><input required type="number" step="0.01" name="price" className="input"/></div>
                <div><label className="label">Días de duración</label><input required type="number" name="durationDays" defaultValue={30} className="input"/></div>
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancelar</button>
                <button disabled={loading} className="btn-primary">{loading ? "Guardando..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
