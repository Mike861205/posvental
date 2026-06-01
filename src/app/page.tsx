import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-violet" />
          <span className="font-semibold text-lg">Posvental</span>
        </div>
        <nav className="flex gap-3">
          <Link href="/login" className="btn-ghost">Iniciar sesión</Link>
          <Link href="/signup" className="btn-primary">Crear cuenta</Link>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-12 pb-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-5xl font-bold leading-tight">
            Administra <span className="bg-gradient-violet bg-clip-text text-transparent">suscripciones</span> de tu gimnasio o estudio.
          </h1>
          <p className="mt-5 text-slate-600 text-lg">
            Zumba, JumpiFit, CrossFit, Gym y más. Cobra con Stripe o Mercado Pago,
            controla vencimientos y vende membresías en minutos.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/signup" className="btn-primary">Comenzar gratis</Link>
            <Link href="/login" className="btn-ghost">Ya tengo cuenta</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl p-6 text-white bg-gradient-violet h-40 shadow-lg" />
          <div className="rounded-2xl p-6 text-white bg-gradient-blue h-40 shadow-lg mt-8" />
          <div className="rounded-2xl p-6 text-white bg-gradient-emerald h-40 shadow-lg" />
          <div className="rounded-2xl p-6 text-white bg-gradient-amber h-40 shadow-lg mt-8" />
        </div>
      </section>
    </main>
  );
}
