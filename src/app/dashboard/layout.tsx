import Image from "next/image";
import { cache } from "react";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "./logout-button";
import { SidebarNav } from "@/components/sidebar-nav";

// Cached so other server components in the same request don't re-query
const getTenant = cache(async (tenantId: string) =>
  prisma.tenant.findUnique({ where: { id: tenantId }, select: { logoUrl: true } })
);

export default async function DashLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  const tenant = await getTenant(session.tenantId);
  const logoUrl = tenant?.logoUrl ?? null;
  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <Image src={logoUrl} alt="Logo" width={36} height={36} className="w-9 h-9 rounded-xl object-cover" />
            ) : (
              <Image src="/logos/posexercise-logo.png" alt="Logo posexercise.com" width={36} height={36} className="w-9 h-9 rounded-xl object-cover" />
            )}
            <div>
              <p className="font-semibold leading-tight">posexercise.com</p>
              <p className="text-xs text-slate-500">{session.tenantName}</p>
            </div>
          </div>
        </div>
        <SidebarNav />
        <div className="p-3 border-t border-slate-200">
          <p className="text-xs text-slate-500 px-2 mb-2">{session.user?.email}</p>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
