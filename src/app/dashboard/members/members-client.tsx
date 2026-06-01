"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { Trash2, Plus } from "lucide-react";

type Member = {
  id: string; fullName: string; email: string | null; phone: string | null;
  birthDate: string | null;
  subscriptions: { endDate: string; status: string; plan: { name: string } }[];
};

export function MembersClient({ initialMembers }: { initialMembers: Member[] }) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/members", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setLoading(false);
    if (res.ok) { setOpen(false); router.refresh(); }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar miembro?")) return;
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (res.ok) setMembers((m) => m.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Miembros</h1>
          <p className="text-slate-500">Gestiona a los clientes de tu negocio.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo miembro
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Contacto</th>
              <th className="text-left p-3">Plan actual</th>
              <th className="text-left p-3">Vence</th>
              <th className="text-left p-3">Estado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-400">Aún no hay miembros.</td></tr>
            )}
            {members.map((m) => {
              const sub = m.subscriptions[0];
              const expired = sub && new Date(sub.endDate) < new Date();
              return (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{m.fullName}</td>
                  <td className="p-3 text-slate-600">{m.email || "—"}<br/><span className="text-xs text-slate-400">{m.phone}</span></td>
                  <td className="p-3">{sub?.plan.name ?? "—"}</td>
                  <td className="p-3">{sub ? formatDate(sub.endDate) : "—"}</td>
                  <td className="p-3">
                    {!sub ? <span className="text-slate-400">Sin sub.</span>
                      : expired ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">Vencida</span>
                      : <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">Activa</span>}
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => remove(m.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
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
            <h2 className="text-xl font-bold mb-4">Nuevo miembro</h2>
            <form onSubmit={add} className="grid gap-3">
              <div><label className="label">Nombre completo</label><input required name="fullName" className="input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Email</label><input type="email" name="email" className="input" /></div>
                <div><label className="label">Teléfono</label><input name="phone" className="input" /></div>
              </div>
              <div><label className="label">Fecha de nacimiento</label><input type="date" name="birthDate" className="input" /></div>
              <div><label className="label">Notas</label><textarea name="notes" className="input" /></div>
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
