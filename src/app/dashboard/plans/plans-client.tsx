"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Pencil } from "lucide-react";

type Plan = { id: string; name: string; description: string | null; price: string | number; durationDays: number; active: boolean };

const gradients = ["bg-gradient-violet", "bg-gradient-blue", "bg-gradient-emerald", "bg-gradient-amber"];

export function PlansClient({ initialPlans }: { initialPlans: Plan[] }) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [openNew, setOpenNew] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/plans", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setLoading(false);
    if (res.ok) { setOpenNew(false); router.refresh(); }
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editPlan) return;
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/plans/${editPlan.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    if (res.ok) {
      const updated: Plan = await res.json();
      setPlans((prev) => prev.map((p) => p.id === updated.id ? updated : p));
      setEditPlan(null);
    }
    setLoading(false);
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
        <button onClick={() => setOpenNew(true)} className="btn-primary flex items-center gap-2"><Plus size={16}/> Nuevo plan</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {plans.length === 0 && <p className="text-slate-400">Aún no hay planes.</p>}
        {plans.map((p, i) => (
          <div key={p.id} className={`${gradients[i % gradients.length]} rounded-2xl p-6 text-white shadow-lg relative`}>
            {/* Botones editar / eliminar */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                onClick={() => setEditPlan(p)}
                className="text-white/70 hover:text-white transition"
                title="Editar plan"
              >
                <Pencil size={15}/>
              </button>
              <button
                onClick={() => remove(p.id)}
                className="text-white/70 hover:text-white transition"
                title="Eliminar plan"
              >
                <Trash2 size={15}/>
              </button>
            </div>
            <p className="text-white/80 text-sm">Plan</p>
            <h3 className="text-2xl font-bold">{p.name}</h3>
            {p.description && <p className="text-white/80 mt-1 text-sm">{p.description}</p>}
            <p className="mt-6 text-4xl font-bold">{formatCurrency(Number(p.price))}</p>
            <p className="text-white/80 text-sm">por {p.durationDays} días</p>
          </div>
        ))}
      </div>

      {/* Modal Nuevo plan */}
      {openNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setOpenNew(false)}>
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
                <button type="button" onClick={() => setOpenNew(false)} className="btn-ghost">Cancelar</button>
                <button disabled={loading} className="btn-primary">{loading ? "Guardando..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar plan */}
      {editPlan && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setEditPlan(null)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Editar plan</h2>
            <form onSubmit={save} className="grid gap-3">
              <div>
                <label className="label">Nombre</label>
                <input required name="name" className="input" defaultValue={editPlan.name}/>
              </div>
              <div>
                <label className="label">Descripción</label>
                <textarea name="description" className="input" defaultValue={editPlan.description ?? ""}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Precio</label>
                  <input required type="number" step="0.01" name="price" className="input" defaultValue={Number(editPlan.price)}/>
                </div>
                <div>
                  <label className="label">Días de duración</label>
                  <input required type="number" name="durationDays" className="input" defaultValue={editPlan.durationDays}/>
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setEditPlan(null)} className="btn-ghost">Cancelar</button>
                <button disabled={loading} className="btn-primary">{loading ? "Guardando..." : "Actualizar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
