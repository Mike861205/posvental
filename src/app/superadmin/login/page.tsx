"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SuperadminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const user = fd.get("user");
    const password = fd.get("password");

    const res = await fetch("/api/superadmin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: typeof user === "string" ? user : "",
        password: typeof password === "string" ? password : "",
      }),
    });

    setLoading(false);
    if (!res.ok) {
      setError("Credenciales inválidas");
      return;
    }
    router.push("/superadmin");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-8 backdrop-blur-xl shadow-2xl">
        <h1 className="text-2xl font-bold">SuperAdmin</h1>
        <p className="mt-1 text-sm text-white/75">Acceso central para gestión de tenants</p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <div>
            <label htmlFor="sa-user" className="label text-white/80">Usuario</label>
            <input
              id="sa-user"
              name="user"
              className="input mt-1 text-slate-900 placeholder:text-slate-400"
              required
              placeholder="Usuario"
            />
          </div>
          <div>
            <label htmlFor="sa-pass" className="label text-white/80">Contraseña</label>
            <input
              id="sa-pass"
              name="password"
              type="password"
              className="input mt-1 text-slate-900 placeholder:text-slate-400"
              required
              placeholder="********"
            />
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-2.5 font-semibold text-white hover:from-indigo-500 hover:to-cyan-400 disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Entrar a SuperAdmin"}
          </button>
        </form>
      </div>
    </main>
  );
}
