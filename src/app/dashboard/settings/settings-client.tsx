"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Bell, CreditCard, Upload, Eye, EyeOff,
  CheckCircle2, AlertCircle, MapPin, Phone, DollarSign,
  Minus, Plus, User,
} from "lucide-react";

type Tenant = {
  name: string; city: string; phone: string; currency: string;
  logoUrl: string | null; warnDaysBeforeExpiry: number;
  hasStripe: boolean; stripePublicKey: string; hasMP: boolean;
};

export function SettingsClient({ tenant }: { readonly tenant: Tenant }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(tenant.logoUrl);
  const [logoLoading, setLogoLoading] = useState(false);
  const [warnDays, setWarnDays] = useState(tenant.warnDaysBeforeExpiry);
  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showMP, setShowMP] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoLoading(true);
    const fd = new FormData();
    fd.append("logo", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setLogoLoading(false);
    if (res.ok) { setLogoUrl(data.logoUrl + "?t=" + Date.now()); router.refresh(); }
    else setMsg({ type: "err", text: data.error ?? "Error al subir imagen" });
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setMsg(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(fd.entries());
    payload.warnDaysBeforeExpiry = warnDays;
    const res = await fetch("/api/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setMsg(res.ok
      ? { type: "ok", text: "Configuración guardada correctamente" }
      : { type: "err", text: "Error al guardar, intenta de nuevo" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-slate-500">Personaliza tu negocio y conecta pasarelas de pago.</p>
      </div>

      <form onSubmit={save} className="space-y-5">

        {/* ─── IDENTIDAD ─────────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <h2 className="font-semibold text-white">Identidad del negocio</h2>
          </div>

          <div className="p-6 flex gap-6 items-start">
            {/* Logo upload */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                onClick={() => fileRef.current?.click()}
                className="w-24 h-24 rounded-2xl cursor-pointer overflow-hidden border-2 border-dashed border-slate-300 hover:border-violet-500 transition-colors flex items-center justify-center bg-slate-50 relative group"
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <Upload size={22} />
                    <span className="text-xs font-medium">Logo</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                  <Upload size={18} className="text-white" />
                  <span className="text-white text-xs">Cambiar</span>
                </div>
                {logoLoading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 text-center leading-tight">
                PNG · JPG · WebP<br />máx. 2 MB
              </p>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={uploadLogo} />
            </div>

            {/* Campos del negocio */}
            <div className="flex-1 grid gap-4">
              <div>
                <label className="label flex items-center gap-1.5 mb-1">
                  <User size={13} className="text-slate-400" /> Nombre del negocio
                </label>
                <input name="name" className="input" defaultValue={tenant.name} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label flex items-center gap-1.5 mb-1">
                    <MapPin size={13} className="text-slate-400" /> Ciudad
                  </label>
                  <input name="city" className="input" defaultValue={tenant.city} placeholder="Ciudad" />
                </div>
                <div>
                  <label className="label flex items-center gap-1.5 mb-1">
                    <Phone size={13} className="text-slate-400" /> Teléfono
                  </label>
                  <input name="phone" className="input" defaultValue={tenant.phone} placeholder="+52 33 ..." />
                </div>
              </div>
              <div>
                <label className="label flex items-center gap-1.5 mb-1">
                  <DollarSign size={13} className="text-slate-400" /> Moneda
                </label>
                <select name="currency" className="input" defaultValue={tenant.currency}>
                  <option value="MXN">MXN — Peso Mexicano</option>
                  <option value="USD">USD — Dólar Americano</option>
                  <option value="ARS">ARS — Peso Argentino</option>
                  <option value="COP">COP — Peso Colombiano</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ─── NOTIFICACIONES ─────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Bell size={16} className="text-white" />
            </div>
            <h2 className="font-semibold text-white">Notificaciones de vencimiento</h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600">
              Configura con cuántos días de anticipación se marcará una suscripción como
              <strong className="text-amber-600"> "Por vencer"</strong> en el dashboard.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium text-slate-700">Avisar</span>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <button
                  type="button"
                  onClick={() => setWarnDays((d) => Math.max(1, d - 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-600"
                >
                  <Minus size={14} />
                </button>
                <span className="w-14 text-center font-bold text-xl text-slate-800 select-none">
                  {warnDays}
                </span>
                <button
                  type="button"
                  onClick={() => setWarnDays((d) => Math.min(30, d + 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-600"
                >
                  <Plus size={14} />
                </button>
              </div>
              <span className="text-sm font-medium text-slate-700">
                día{warnDays !== 1 ? "s" : ""} antes del vencimiento
              </span>
              <span className="text-xs text-slate-400 ml-auto">(1–30 días)</span>
            </div>
            <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
              <Bell size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                Las suscripciones que vencen en los próximos{" "}
                <strong>{warnDays} día{warnDays !== 1 ? "s" : ""}</strong> aparecerán
                destacadas en el dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* ─── STRIPE ─────────────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <CreditCard size={16} className="text-white" />
              </div>
              <h2 className="font-semibold text-white">Stripe</h2>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-medium border
              ${tenant.hasStripe
                ? "bg-emerald-400/30 text-emerald-100 border-emerald-400/30"
                : "bg-white/20 text-white/80 border-white/20"}`}>
              {tenant.hasStripe ? "✓ Configurado" : "Sin configurar"}
            </span>
          </div>
          <div className="p-6 grid gap-4">
            <div>
              <label className="label mb-1">
                Clave pública <span className="text-slate-400 font-normal">(pk_live_... / pk_test_...)</span>
              </label>
              <input name="stripePublicKey" className="input font-mono text-sm" defaultValue={tenant.stripePublicKey} placeholder="pk_live_xxxxxxxxxxxx" />
            </div>
            <div>
              <label className="label mb-1">
                Clave secreta <span className="text-slate-400 font-normal">(sk_live_... / sk_test_...)</span>
              </label>
              <div className="relative">
                <input
                  name="stripeSecretKey"
                  type={showStripeSecret ? "text" : "password"}
                  className="input font-mono text-sm pr-10"
                  placeholder={tenant.hasStripe ? "Dejar en blanco para no cambiar" : "sk_live_xxxxxxxxxxxx"}
                />
                <button type="button" onClick={() => setShowStripeSecret((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                  {showStripeSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Deja en blanco para conservar la clave actual.</p>
            </div>
          </div>
        </div>

        {/* ─── MERCADO PAGO ────────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-sky-500 to-cyan-500 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <CreditCard size={16} className="text-white" />
              </div>
              <h2 className="font-semibold text-white">Mercado Pago</h2>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-medium border
              ${tenant.hasMP
                ? "bg-emerald-400/30 text-emerald-100 border-emerald-400/30"
                : "bg-white/20 text-white/80 border-white/20"}`}>
              {tenant.hasMP ? "✓ Configurado" : "Sin configurar"}
            </span>
          </div>
          <div className="p-6">
            <label className="label mb-1">
              Access Token <span className="text-slate-400 font-normal">(APP_USR-...)</span>
            </label>
            <div className="relative">
              <input
                name="mpAccessToken"
                type={showMP ? "text" : "password"}
                className="input font-mono text-sm pr-10"
                placeholder={tenant.hasMP ? "Dejar en blanco para no cambiar" : "APP_USR-xxxxxxxxxxxx"}
              />
              <button type="button" onClick={() => setShowMP((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                {showMP ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Obtén tu token en Panel de Mercado Pago → Credenciales de producción.
            </p>
          </div>
        </div>

        {/* ─── GUARDAR ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <button
            disabled={saving}
            className="btn-primary px-8 py-2.5 min-w-[200px] flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </>
            ) : "Guardar configuración"}
          </button>
          {msg && (
            <div className={`flex items-center gap-2 text-sm font-medium
              ${msg.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
              {msg.type === "ok" ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
              {msg.text}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
