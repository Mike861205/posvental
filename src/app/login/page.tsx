"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setErr(null);
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) { setErr("Credenciales inválidas"); return; }
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-pink-100 p-6">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        {sp?.get("registered") && (
          <p className="mt-2 text-emerald-600 text-sm">Cuenta creada, inicia sesión.</p>
        )}
        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <div>
            <label className="label">Email</label>
            <input required type="email" name="email" className="input" />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input required type="password" name="password" className="input" />
          </div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button disabled={loading} className="btn-primary">
            {loading ? "Entrando..." : "Entrar"}
          </button>
          <p className="text-sm text-slate-500 text-center">
            ¿No tienes cuenta? <Link className="text-brand-600 font-medium" href="/signup">Regístrate</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
