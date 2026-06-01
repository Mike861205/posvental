"use client";
import { useState } from "react";

export function SettingsClient({ tenant }: {
  tenant: { name: string; city: string | null; phone: string | null; currency: string;
            hasStripe: boolean; stripePublicKey: string; hasMP: boolean };
}) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/settings", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setSaving(false);
    setMsg(res.ok ? "Configuración guardada ✔" : "Error al guardar");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-slate-500">Información del negocio y pasarelas de pago.</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <div className="card p-6">
          <h2 className="font-semibold mb-4">Negocio</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="label">Nombre</label><input className="input" defaultValue={tenant.name} disabled/></div>
            <div><label className="label">Moneda</label>
              <select name="currency" className="input" defaultValue={tenant.currency}>
                <option value="MXN">MXN — Peso Mexicano</option>
                <option value="USD">USD — Dólar</option>
                <option value="ARS">ARS — Peso Argentino</option>
                <option value="COP">COP — Peso Colombiano</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Stripe</h2>
            <span className={`text-xs px-2 py-1 rounded-full ${tenant.hasStripe ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {tenant.hasStripe ? "Configurado" : "Sin configurar"}
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="label">Public Key (pk_...)</label>
              <input name="stripePublicKey" className="input" defaultValue={tenant.stripePublicKey} placeholder="pk_live_..."/></div>
            <div><label className="label">Secret Key (sk_...)</label>
              <input name="stripeSecretKey" className="input" placeholder={tenant.hasStripe ? "•••••••" : "sk_live_..."}/></div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Mercado Pago</h2>
            <span className={`text-xs px-2 py-1 rounded-full ${tenant.hasMP ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {tenant.hasMP ? "Configurado" : "Sin configurar"}
            </span>
          </div>
          <div><label className="label">Access Token</label>
            <input name="mpAccessToken" className="input" placeholder={tenant.hasMP ? "•••••••" : "APP_USR-..."}/></div>
        </div>

        <div className="flex items-center gap-3">
          <button disabled={saving} className="btn-primary">{saving ? "Guardando..." : "Guardar configuración"}</button>
          {msg && <span className="text-sm text-slate-600">{msg}</span>}
        </div>
      </form>
    </div>
  );
}
