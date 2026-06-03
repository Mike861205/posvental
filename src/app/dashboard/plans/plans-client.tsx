"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Pencil, AlertTriangle, Sparkles, X } from "lucide-react";

type Plan = { id: string; name: string; description: string | null; price: string | number; durationDays: number; active: boolean };
type PlansClientProps = { readonly initialPlans: ReadonlyArray<Plan> };

const gradients = ["bg-gradient-violet", "bg-gradient-blue", "bg-gradient-emerald", "bg-gradient-amber"];

export function PlansClient({ initialPlans }: PlansClientProps) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [openNew, setOpenNew] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/plans", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setFormLoading(false);
    if (res.ok) { setOpenNew(false); router.refresh(); }
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editPlan) return;
    setFormLoading(true);
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
    setFormLoading(false);
  }

  async function remove() {
    if (!planToDelete) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/plans/${planToDelete.id}`, { method: "DELETE" });
    if (res.ok) {
      setPlans((p) => p.filter((x) => x.id !== planToDelete.id));
      setPlanToDelete(null);
    }
    setDeleteLoading(false);
  }

  let submitLabel = "Crear plan";
  if (formLoading) {
    submitLabel = "Guardando...";
  } else if (editPlan) {
    submitLabel = "Actualizar plan";
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
                onClick={() => setPlanToDelete(p)}
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

      {(openNew || editPlan) ? (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          aria-labelledby="plan-modal-title"
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl"
          >
            <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
                    <Sparkles size={14} />
                    Plan de membresia
                  </p>
                  <h2 id="plan-modal-title" className="mt-1 text-2xl font-bold">{editPlan ? "Editar plan" : "Nuevo plan"}</h2>
                  <p className="mt-1 text-sm text-white/80">
                    {editPlan ? "Actualiza precio, duracion y descripcion del plan." : "Crea un plan atractivo para tus miembros."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpenNew(false);
                    setEditPlan(null);
                  }}
                  className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
                  title="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <form onSubmit={editPlan ? save : add} className="grid gap-5 p-6">
              <div className="space-y-2">
                <label htmlFor="plan-name" className="label">Nombre del plan</label>
                <input
                  id="plan-name"
                  required
                  name="name"
                  aria-label="Nombre del plan"
                  className="input"
                  defaultValue={editPlan?.name ?? ""}
                  placeholder="Ej: Mensualidad Gym"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="plan-description" className="label">Descripcion</label>
                <textarea
                  id="plan-description"
                  name="description"
                  aria-label="Descripcion del plan"
                  rows={3}
                  className="input"
                  defaultValue={editPlan?.description ?? ""}
                  placeholder="Incluye acceso, horarios y beneficios"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="plan-price" className="label">Precio</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                      $
                    </span>
                    <input
                      id="plan-price"
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      name="price"
                      aria-label="Precio del plan"
                      className="input pl-7"
                      defaultValue={editPlan ? Number(editPlan.price) : ""}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="plan-duration" className="label">Duracion (dias)</label>
                  <input
                    id="plan-duration"
                    required
                    type="number"
                    min="1"
                    name="durationDays"
                    aria-label="Duracion en dias"
                    className="input"
                    defaultValue={editPlan?.durationDays ?? 30}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                El plan se mostrara en tarjetas de colores dentro del panel de Planes y Suscripciones.
              </div>

              <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setOpenNew(false);
                    setEditPlan(null);
                  }}
                  className="btn-ghost"
                >
                  Cancelar
                </button>
                <button disabled={formLoading} className="btn-primary">
                  {submitLabel}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      ) : null}

      {planToDelete ? (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
          aria-labelledby="delete-plan-title"
        >
          <div
            className="w-full max-w-md rounded-3xl border border-rose-100 bg-white p-6 shadow-2xl"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle size={22} />
            </div>
            <h3 id="delete-plan-title" className="text-center text-xl font-bold text-slate-900">Eliminar plan</h3>
            <p className="mt-2 text-center text-sm text-slate-600">
              Vas a eliminar <span className="font-semibold text-slate-800">{planToDelete.name}</span>. Esta accion no se puede deshacer.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setPlanToDelete(null)}
                disabled={deleteLoading}
              >
                Conservar plan
              </button>
              <button
                type="button"
                className="btn rounded-xl bg-rose-600 text-white hover:bg-rose-700"
                onClick={remove}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Eliminando..." : "Si, eliminar"}
              </button>
            </div>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
