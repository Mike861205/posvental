"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, CreditCard, Package, Settings, ReceiptText, ShoppingCart, Boxes } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/dashboard/members", label: "Miembros", Icon: Users },
  { href: "/dashboard/plans", label: "Planes", Icon: Package },
  { href: "/dashboard/subscriptions", label: "Suscripciones", Icon: CreditCard },
  { href: "/dashboard/payments", label: "Pagos", Icon: ReceiptText },
  { href: "/dashboard/pos", label: "Punto de Venta", Icon: ShoppingCart },
  { href: "/dashboard/products", label: "Productos", Icon: Boxes },
  { href: "/dashboard/settings", label: "Configuración", Icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-3 space-y-1">
      {nav.map(({ href, label, Icon }) => {
        const isActive =
          href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
              isActive
                ? "bg-violet-50 text-violet-700 font-medium"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Icon
              size={18}
              className={isActive ? "text-violet-600" : "text-slate-500"}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
