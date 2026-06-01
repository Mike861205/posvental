import Link from "next/link";
import { requireSession } from "@/lib/session";
import { LogoutButton } from "./logout-button";
import { LayoutDashboard, Users, CreditCard, Package, Settings, ReceiptText } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/dashboard/members", label: "Miembros", Icon: Users },
  { href: "/dashboard/plans", label: "Planes", Icon: Package },
  { href: "/dashboard/subscriptions", label: "Suscripciones", Icon: CreditCard },
  { href: "/dashboard/payments", label: "Pagos", Icon: ReceiptText },
  { href: "/dashboard/settings", label: "Configuración", Icon: Settings },
];

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-violet" />
            <div>
              <p className="font-semibold leading-tight">Posvental</p>
              <p className="text-xs text-slate-500">{session.tenantName}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ href, label, Icon }) => (
            <Link
              key={href} href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-700 hover:bg-slate-100"
            >
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <p className="text-xs text-slate-500 px-2 mb-2">{session.user?.email}</p>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
