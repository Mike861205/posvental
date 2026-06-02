"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Trash2, Plus, Medal, ImagePlus, User, Pencil } from "lucide-react";
import { DateFilterBar, DateRange, FilterPreset, getDateRange, filterByDate } from "@/components/date-filter-bar";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";

type Member = {
  id: string; fullName: string; photoUrl?: string | null; email: string | null; phone: string | null;
  birthDate: string | null; createdAt: string;
  subscriptions: { endDate: string; status: string; plan: { name: string } }[];
  subscriptionsSpend: number;
  posSpend: number;
  totalSpend: number;
};

type RankingMetric = "total" | "subscriptions" | "pos";
type MembersView = "members" | "ranking";

async function uploadMemberPhoto(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload/members", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "No se pudo subir la foto");
  return data.url as string;
}

export function MembersClient({ initialMembers }: Readonly<{ initialMembers: Member[] }>) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [open, setOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [memberFormError, setMemberFormError] = useState<string | null>(null);
  const [view, setView] = useState<MembersView>("members");
  const [preset, setPreset] = useState<FilterPreset>("all");
  const [custom, setCustom] = useState<DateRange>({ from: null, to: null });
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>("total");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [removeEditPhoto, setRemoveEditPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const editObjectUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    if (editObjectUrlRef.current) URL.revokeObjectURL(editObjectUrlRef.current);
  }, []);

  function resetPhotoState() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const preview = URL.createObjectURL(file);
    objectUrlRef.current = preview;
    setPhotoPreview(preview);
  }

  function resetEditPhotoState() {
    if (editObjectUrlRef.current) {
      URL.revokeObjectURL(editObjectUrlRef.current);
      editObjectUrlRef.current = null;
    }
    setEditPhotoPreview(null);
    setRemoveEditPhoto(false);
    if (editFileRef.current) editFileRef.current.value = "";
  }

  function onPickEditPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (editObjectUrlRef.current) URL.revokeObjectURL(editObjectUrlRef.current);
    const preview = URL.createObjectURL(file);
    editObjectUrlRef.current = preview;
    setEditPhotoPreview(preview);
    setRemoveEditPhoto(false);
  }

  function clearEditPhoto() {
    if (editObjectUrlRef.current) {
      URL.revokeObjectURL(editObjectUrlRef.current);
      editObjectUrlRef.current = null;
    }
    setEditPhotoPreview(null);
    setRemoveEditPhoto(true);
    if (editFileRef.current) editFileRef.current.value = "";
  }

  function openEdit(member: Member) {
    setMemberFormError(null);
    setEditMember(member);
    setEditPhotoPreview(member.photoUrl ?? null);
    setRemoveEditPhoto(false);
    if (editFileRef.current) editFileRef.current.value = "";
  }

  const filtered = useMemo(() => {
    const range = getDateRange(preset, custom);
    return filterByDate(members as unknown as Record<string, unknown>[], range, "createdAt") as unknown as Member[];
  }, [members, preset, custom]);

  const topMembers = useMemo(() => {
    const sorted = [...members].sort((a, b) => {
      if (rankingMetric === "subscriptions") return b.subscriptionsSpend - a.subscriptionsSpend;
      if (rankingMetric === "pos") return b.posSpend - a.posSpend;
      return b.totalSpend - a.totalSpend;
    });
    return sorted.slice(0, 10);
  }, [members, rankingMetric]);

  const COLUMNS = [
    { header: "Nombre", key: "fullName" },
    { header: "Email", key: "email" },
    { header: "Teléfono", key: "phone" },
    { header: "Alta", key: "createdAt" },
    { header: "Consumo suscripciones", key: "subscriptionsSpend" },
    { header: "Consumo punto de venta", key: "posSpend" },
    { header: "Consumo total", key: "totalSpend" },
  ];

  function exportRows() {
    return filtered.map((m) => ({
      fullName: m.fullName,
      email: m.email ?? "",
      phone: m.phone ?? "",
      createdAt: formatDate(m.createdAt),
      subscriptionsSpend: formatCurrency(m.subscriptionsSpend),
      posSpend: formatCurrency(m.posSpend),
      totalSpend: formatCurrency(m.totalSpend),
    }));
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setMemberFormError(null);
    const fd = new FormData(e.currentTarget);
    const entries = Object.fromEntries(fd.entries()) as Record<string, FormDataEntryValue>;
    const photoFile = fd.get("photo") as File | null;
    delete entries.photo;

    let photoUrl: string | null = null;
    if (photoFile && photoFile.size > 0) {
      try {
        photoUrl = await uploadMemberPhoto(photoFile);
      } catch (err) {
        setLoading(false);
        const message = err instanceof Error ? err.message : "No se pudo subir la foto del miembro.";
        setMemberFormError(message);
        return;
      }
    }

    const res = await fetch("/api/members", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...entries, photoUrl }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMemberFormError(data?.error ?? "No se pudo guardar el miembro.");
      return;
    }

    setOpen(false);
    resetPhotoState();
    router.refresh();
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editMember) return;
    setLoading(true);
    setMemberFormError(null);

    const fd = new FormData(e.currentTarget);
    const entries = Object.fromEntries(fd.entries()) as Record<string, FormDataEntryValue>;
    const photoFile = fd.get("photo") as File | null;
    delete entries.photo;

    let photoUrl: string | null = removeEditPhoto ? null : (editMember.photoUrl ?? null);
    if (photoFile && photoFile.size > 0) {
      try {
        photoUrl = await uploadMemberPhoto(photoFile);
      } catch (err) {
        setLoading(false);
        const message = err instanceof Error ? err.message : "No se pudo subir la foto del miembro.";
        setMemberFormError(message);
        return;
      }
    }

    const res = await fetch(`/api/members/${editMember.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...entries, photoUrl }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setMemberFormError(data?.error ?? "No se pudo actualizar el miembro.");
      return;
    }

    setEditMember(null);
    resetEditPhotoState();
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar miembro?")) return;
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (res.ok) setMembers((m) => m.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Miembros</h1>
          <p className="text-slate-500">Gestiona a los clientes de tu negocio.</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo miembro
        </button>
      </div>

      <div className="inline-flex rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setView("members")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${view === "members" ? "bg-white shadow text-violet-700" : "text-slate-600 hover:text-slate-900"}`}
        >
          Datos de miembros
        </button>
        <button
          onClick={() => setView("ranking")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${view === "ranking" ? "bg-white shadow text-violet-700" : "text-slate-600 hover:text-slate-900"}`}
        >
          Ranking
        </button>
      </div>

      {view === "members" && (
        <>
          <DateFilterBar
            preset={preset} setPreset={setPreset}
            custom={custom} setCustom={setCustom}
            resultCount={filtered.length}
            onExportExcel={() => exportToExcel(exportRows(), COLUMNS, "miembros")}
            onExportPDF={() => exportToPDF(exportRows(), COLUMNS, "miembros", "Listado de Miembros")}
          />

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-3">Nombre</th>
                  <th className="text-left p-3">Contacto</th>
                  <th className="text-left p-3">Alta</th>
                  <th className="text-left p-3">Plan actual</th>
                  <th className="text-left p-3">Vence</th>
                  <th className="text-left p-3">Estado</th>
                  <th className="text-right p-3">Subscripciones</th>
                  <th className="text-right p-3">Punto de venta</th>
                  <th className="text-right p-3">Total consumo</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="p-6 text-center text-slate-400">Sin resultados para el período seleccionado.</td></tr>
                )}
                {filtered.map((m) => {
                  const sub = m.subscriptions[0];
                  const expired = sub && new Date(sub.endDate) < new Date();
                  let statusNode = <span className="text-slate-400 text-xs">Sin sub.</span>;
                  if (sub) {
                    statusNode = expired
                      ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">Vencida</span>
                      : <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">Activa</span>;
                  }
                  return (
                    <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-100 shrink-0">
                            {m.photoUrl ? (
                              <img src={m.photoUrl} alt={m.fullName} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-slate-300">
                                <User size={14} />
                              </div>
                            )}
                          </div>
                          <span>{m.fullName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">{m.email || "—"}<br/><span className="text-xs text-slate-400">{m.phone}</span></td>
                      <td className="p-3 text-slate-500 text-xs">{formatDate(m.createdAt)}</td>
                      <td className="p-3">{sub?.plan.name ?? "—"}</td>
                      <td className="p-3">{sub ? formatDate(sub.endDate) : "—"}</td>
                      <td className="p-3">{statusNode}</td>
                      <td className="p-3 text-right font-medium text-slate-700">{formatCurrency(m.subscriptionsSpend)}</td>
                      <td className="p-3 text-right font-medium text-slate-700">{formatCurrency(m.posSpend)}</td>
                      <td className="p-3 text-right font-semibold text-violet-700">{formatCurrency(m.totalSpend)}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => openEdit(m)} className="text-slate-400 hover:text-violet-600 transition-colors mr-3"><Pencil size={16} /></button>
                        <button onClick={() => remove(m.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === "ranking" && (
        <div className="card p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Ranking de clientes</h2>
              <p className="text-sm text-slate-500">Top 10 clientes con mayor consumo.</p>
            </div>

            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => setRankingMetric("total")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${rankingMetric === "total" ? "bg-white shadow text-violet-700" : "text-slate-600 hover:text-slate-900"}`}
              >
                Total
              </button>
              <button
                onClick={() => setRankingMetric("subscriptions")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${rankingMetric === "subscriptions" ? "bg-white shadow text-violet-700" : "text-slate-600 hover:text-slate-900"}`}
              >
                Suscripciones
              </button>
              <button
                onClick={() => setRankingMetric("pos")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${rankingMetric === "pos" ? "bg-white shadow text-violet-700" : "text-slate-600 hover:text-slate-900"}`}
              >
                Punto de venta
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-left border-b border-slate-100">
                <tr>
                  <th className="py-2 w-24">Puesto</th>
                  <th className="py-2">Cliente</th>
                  <th className="py-2 text-right">Suscripciones</th>
                  <th className="py-2 text-right">Punto de venta</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {topMembers.map((member, idx) => {
                  const rank = idx + 1;
                  let medalTone = "text-slate-300";
                  if (rank === 1) medalTone = "text-amber-500";
                  if (rank === 2) medalTone = "text-slate-400";
                  if (rank === 3) medalTone = "text-orange-500";

                  return (
                    <tr key={member.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-3">
                        <div className="inline-flex items-center gap-2 font-semibold text-slate-700">
                          <span className="w-6 text-right">{rank}</span>
                          {rank <= 3 && <Medal size={15} className={medalTone} />}
                        </div>
                      </td>
                      <td className="py-3 font-medium text-slate-800">{member.fullName}</td>
                      <td className="py-3 text-right text-slate-700">{formatCurrency(member.subscriptionsSpend)}</td>
                      <td className="py-3 text-right text-slate-700">{formatCurrency(member.posSpend)}</td>
                      <td className="py-3 text-right font-semibold text-violet-700">{formatCurrency(member.totalSpend)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Nuevo miembro</h2>
            <form onSubmit={add} className="grid gap-3">
              <div>
                <label className="label" htmlFor="m-photo">Foto de perfil</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 hover:border-violet-500 hover:text-violet-600 transition-colors"
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Vista previa" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus size={20} />
                    )}
                  </button>
                  <p className="text-xs text-slate-500 leading-5">
                    Selecciona o toma una foto desde cualquier dispositivo.<br />
                    JPG, PNG, WebP o GIF. Max. 4 MB.
                  </p>
                </div>
                <input
                  ref={fileRef}
                  id="m-photo"
                  type="file"
                  name="photo"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  capture="environment"
                  className="hidden"
                  onChange={onPickPhoto}
                />
              </div>
              <div><label className="label" htmlFor="m-fullname">Nombre completo</label><input id="m-fullname" required name="fullName" className="input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label" htmlFor="m-email">Email</label><input id="m-email" type="email" name="email" className="input" /></div>
                <div><label className="label" htmlFor="m-phone">Teléfono</label><input id="m-phone" name="phone" className="input" /></div>
              </div>
              <div><label className="label" htmlFor="m-birth">Fecha de nacimiento</label><input id="m-birth" type="date" name="birthDate" className="input" /></div>
              <div><label className="label" htmlFor="m-notes">Notas</label><textarea id="m-notes" name="notes" className="input" /></div>
              {memberFormError && <p className="text-sm text-red-600">{memberFormError}</p>}
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => { setOpen(false); resetPhotoState(); }} className="btn-ghost">Cancelar</button>
                <button disabled={loading} className="btn-primary">{loading ? "Guardando..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Editar miembro</h2>
            <form onSubmit={saveEdit} className="grid gap-3">
              <div>
                <label className="label" htmlFor="m-edit-photo">Foto de perfil</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => editFileRef.current?.click()}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 hover:border-violet-500 hover:text-violet-600 transition-colors"
                  >
                    {editPhotoPreview ? (
                      <img src={editPhotoPreview} alt="Vista previa" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus size={20} />
                    )}
                  </button>
                  <div className="text-xs text-slate-500 leading-5">
                    <p>Actualiza la foto del miembro desde cualquier dispositivo.</p>
                    <p>JPG, PNG, WebP o GIF. Max. 4 MB.</p>
                    {editPhotoPreview && (
                      <button type="button" onClick={clearEditPhoto} className="text-red-500 hover:text-red-700 mt-1">
                        Quitar foto
                      </button>
                    )}
                  </div>
                </div>
                <input
                  ref={editFileRef}
                  id="m-edit-photo"
                  type="file"
                  name="photo"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  capture="environment"
                  className="hidden"
                  onChange={onPickEditPhoto}
                />
              </div>
              <div><label className="label" htmlFor="m-edit-fullname">Nombre completo</label><input id="m-edit-fullname" required name="fullName" className="input" defaultValue={editMember.fullName} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label" htmlFor="m-edit-email">Email</label><input id="m-edit-email" type="email" name="email" className="input" defaultValue={editMember.email ?? ""} /></div>
                <div><label className="label" htmlFor="m-edit-phone">Teléfono</label><input id="m-edit-phone" name="phone" className="input" defaultValue={editMember.phone ?? ""} /></div>
              </div>
              <div><label className="label" htmlFor="m-edit-birth">Fecha de nacimiento</label><input id="m-edit-birth" type="date" name="birthDate" className="input" defaultValue={editMember.birthDate ? editMember.birthDate.slice(0, 10) : ""} /></div>
              <div><label className="label" htmlFor="m-edit-notes">Notas</label><textarea id="m-edit-notes" name="notes" className="input" defaultValue={(editMember as Member & { notes?: string | null }).notes ?? ""} /></div>
              {memberFormError && <p className="text-sm text-red-600">{memberFormError}</p>}
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => { setEditMember(null); resetEditPhotoState(); }} className="btn-ghost">Cancelar</button>
                <button disabled={loading} className="btn-primary">{loading ? "Guardando..." : "Guardar cambios"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


