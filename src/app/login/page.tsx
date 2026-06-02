"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setErr(null);
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email");
    const password = fd.get("password");
    const res = await signIn("credentials", {
      email: typeof email === "string" ? email : "",
      password: typeof password === "string" ? password : "",
      redirect: false,
    });
    setLoading(false);
    if (res?.error) { setErr("Credenciales inválidas"); return; }
    router.push("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 p-6">
      <div aria-hidden="true" className="absolute inset-0">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="absolute top-16 right-4 h-96 w-96 rounded-full bg-sky-500/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(255,255,255,0.06),transparent_30%)]" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-3rem)] max-w-5xl items-center gap-8 lg:grid-cols-2">
        <section className="hidden lg:block text-white">
          <div className="mb-8 inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">
            <Image
              src="/logos/posexercise-logo.png"
              alt="Logo posexercise.com"
              width={34}
              height={34}
              className="h-8 w-8 rounded-lg object-cover"
            />
            <p className="font-semibold tracking-wide">posexercise.com</p>
          </div>
          <h1 className="text-5xl font-bold leading-tight">
            <span>Tu negocio fitness,</span>
            <span className="block bg-gradient-to-r from-fuchsia-300 via-indigo-200 to-cyan-200 bg-clip-text text-transparent">
              controlado desde un solo lugar.
            </span>
          </h1>
          <p className="mt-5 max-w-md text-white/80 text-lg">
            Gestiona membresias, pagos y vencimientos en segundos con una experiencia moderna para tu equipo.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-400/15 px-4 py-2 text-emerald-100">
            <ShieldCheck size={18} />
            <span className="text-sm font-medium">Acceso seguro al panel administrativo</span>
          </div>
        </section>

        <section className="rounded-3xl border border-white/20 bg-white/90 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-10">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <Image
              src="/logos/posexercise-logo.png"
              alt="Logo posexercise.com"
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-cover"
            />
            <p className="font-semibold tracking-wide text-slate-700">posexercise.com</p>
          </div>

          <h2 className="text-3xl font-bold text-slate-900">Iniciar sesión</h2>
          <p className="mt-2 text-sm text-slate-500">Ingresa a tu panel administrativo.</p>
          {sp?.get("registered") && (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 text-sm">
              Cuenta creada correctamente. Ya puedes iniciar sesión.
            </p>
          )}

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <div className="relative mt-1">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  required
                  type="email"
                  name="email"
                  className="w-full rounded-xl border border-slate-200 bg-white px-10 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">Contraseña</label>
              <div className="relative mt-1">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  required
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-10 py-3 pr-11 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {err && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">{err}</p>}

            <button
              disabled={loading}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.01] hover:from-indigo-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Entrando..." : "Entrar"}
              {!loading && <ArrowRight size={17} />}
            </button>

            <p className="text-sm text-slate-500 text-center">
              ¿No tienes cuenta? <Link className="font-semibold text-brand-600 hover:text-brand-700" href="/signup">Regístrate</Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
