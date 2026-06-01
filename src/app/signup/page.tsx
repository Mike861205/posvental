"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setErr(null);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    const res = await fetch("/api/signup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setErr(data.error || "Error"); return; }
    router.push("/login?registered=1");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-pink-100 p-6">
      <div className="card w-full max-w-lg p-8">
        <h1 className="text-2xl font-bold">Crear cuenta</h1>
        <p className="text-slate-500 text-sm mt-1">Registra tu negocio y empieza a administrar suscripciones.</p>
        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <div>
            <label className="label">Nombre del negocio</label>
            <input required name="tenantName" className="input" placeholder="Iron Gym" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Ciudad</label>
              <input name="city" className="input" placeholder="CDMX" />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input name="phone" className="input" placeholder="+52 ..." />
            </div>
          </div>
          <div>
            <label className="label">Tu nombre</label>
            <input name="userName" className="input" placeholder="Juan Pérez" />
          </div>
          <div>
            <label className="label">Email</label>
            <input required type="email" name="email" className="input" placeholder="tu@correo.com" />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input required type="password" minLength={6} name="password" className="input" />
          </div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button disabled={loading} className="btn-primary mt-2">
            {loading ? "Creando..." : "Crear cuenta"}
          </button>
          <p className="text-sm text-slate-500 text-center">
            ¿Ya tienes cuenta? <Link className="text-brand-600 font-medium" href="/login">Inicia sesión</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
