import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const whatsappMessage = encodeURIComponent(
    "A tus ordenes cuentame mas de tu negocio y que deseas implementar para ayudarte en tu operacion dia a dia",
  );

  const trainingCards = [
    {
      gradient: "bg-gradient-violet",
      image: "https://images.pexels.com/photos/3757376/pexels-photo-3757376.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Personas en clase de zumba",
      offset: "",
    },
    {
      gradient: "bg-gradient-blue",
      image: "https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Personas entrenando con saltos",
      offset: "mt-8",
    },
    {
      gradient: "bg-gradient-emerald",
      image: "https://images.pexels.com/photos/917732/pexels-photo-917732.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Entrenamiento funcional en grupo",
      offset: "",
    },
    {
      gradient: "bg-gradient-amber",
      image: "https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Clase de cardio y jumpfit",
      offset: "mt-8",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0" aria-hidden="true">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover opacity-40"
          poster="https://images.pexels.com/photos/3757376/pexels-photo-3757376.jpeg?auto=compress&cs=tinysrgb&w=1200"
        >
          <source src="/hero-training.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/75 via-white/72 to-pink-100/72" />
      </div>

      <div className="relative z-10">
        <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logos/posexercise-logo.png"
              alt="Logo posexercise.com"
              width={40}
              height={40}
              className="w-10 h-10 rounded-xl object-cover"
            />
            <span className="font-semibold text-lg">posexercise.com</span>
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
            <p className="mt-5 text-slate-700 text-lg">
              Zumba, JumpiFit, CrossFit, Gym y más. Cobra con Stripe o Mercado Pago,
              controla vencimientos y vende membresías en minutos.
            </p>
            <div className="mt-8 flex gap-3">
              <Link href="/signup" className="btn-primary">Comenzar gratis</Link>
              <Link href="/login" className="btn-ghost">Ya tengo cuenta</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {trainingCards.map((card) => (
              <div
                key={card.image}
                className={`relative rounded-2xl p-6 text-white ${card.gradient} h-40 shadow-lg overflow-hidden ${card.offset}`}
              >
                <img
                  src={card.image}
                  alt={card.alt}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/20 to-transparent" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <a
        href={`https://wa.me/526241370820?text=${whatsappMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        className="fixed bottom-6 right-6 z-20 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-xl hover:scale-105 transition-transform flex items-center justify-center"
      >
        <svg viewBox="0 0 32 32" className="w-8 h-8 fill-current" aria-hidden="true">
          <path d="M19.11 17.21c-.27-.14-1.58-.78-1.82-.87-.24-.09-.42-.14-.6.14-.18.27-.69.87-.85 1.05-.16.18-.31.2-.58.07-.27-.14-1.12-.41-2.14-1.31-.79-.7-1.33-1.57-1.49-1.84-.16-.27-.02-.41.12-.55.13-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.05-.34-.02-.47-.07-.14-.6-1.45-.82-1.99-.22-.52-.44-.45-.6-.46-.15-.01-.34-.01-.52-.01s-.47.07-.71.34c-.25.27-.95.93-.95 2.26s.98 2.61 1.12 2.79c.14.18 1.93 2.95 4.68 4.13.65.28 1.16.45 1.56.57.66.21 1.26.18 1.73.11.53-.08 1.58-.65 1.81-1.28.22-.63.22-1.16.16-1.28-.07-.11-.25-.18-.52-.32z" />
          <path d="M16.03 3.2C9.01 3.2 3.31 8.9 3.31 15.92c0 2.25.59 4.45 1.72 6.39L3.2 28.8l6.66-1.75a12.67 12.67 0 006.17 1.59h.01c7.02 0 12.72-5.7 12.72-12.72S23.06 3.2 16.03 3.2zm0 23.16h-.01a10.5 10.5 0 01-5.35-1.47l-.38-.22-3.95 1.04 1.05-3.85-.25-.4a10.5 10.5 0 01-1.62-5.54c0-5.79 4.71-10.5 10.5-10.5 2.8 0 5.42 1.09 7.4 3.07a10.4 10.4 0 013.08 7.43c0 5.79-4.71 10.5-10.5 10.5z" />
        </svg>
      </a>
    </main>
  );
}
