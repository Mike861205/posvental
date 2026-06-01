import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";
import { formatCurrency } from "@/lib/utils";
import { Users, CreditCard, AlertTriangle, DollarSign } from "lucide-react";
import { RevenueChart } from "./revenue-chart";

export default async function DashboardPage() {
  const tenantId = await requireTenantId();

  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [members, activeSubs, expiringSoon, monthRevenue, last6] = await Promise.all([
    prisma.member.count({ where: { tenantId } }),
    prisma.subscription.count({ where: { tenantId, status: "ACTIVE", endDate: { gte: now } } }),
    prisma.subscription.count({ where: { tenantId, status: "ACTIVE", endDate: { gte: now, lte: in7 } } }),
    prisma.payment.aggregate({
      where: { tenantId, status: "PAID", createdAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.payment.findMany({
      where: { tenantId, status: "PAID", createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
      select: { amount: true, createdAt: true },
    }),
  ]);

  const buckets: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets[d.toLocaleDateString("es-MX", { month: "short" })] = 0;
  }
  for (const p of last6) {
    const k = p.createdAt.toLocaleDateString("es-MX", { month: "short" });
    if (k in buckets) buckets[k] += Number(p.amount);
  }
  const chartData = Object.entries(buckets).map(([month, total]) => ({ month, total }));

  const cards = [
    { label: "Miembros", value: members, Icon: Users, gradient: "bg-gradient-violet" },
    { label: "Suscripciones activas", value: activeSubs, Icon: CreditCard, gradient: "bg-gradient-blue" },
    { label: "Por vencer (7d)", value: expiringSoon, Icon: AlertTriangle, gradient: "bg-gradient-amber" },
    { label: "Ingresos del mes", value: formatCurrency(Number(monthRevenue._sum.amount ?? 0)), Icon: DollarSign, gradient: "bg-gradient-emerald" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-slate-500">Resumen general de tu negocio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => (
          <div key={c.label} className={`${c.gradient} rounded-2xl p-5 text-white shadow-lg`}>
            <div className="flex items-center justify-between">
              <p className="text-white/80 text-sm">{c.label}</p>
              <c.Icon size={20} className="opacity-80" />
            </div>
            <p className="mt-3 text-3xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-4">Ingresos últimos 6 meses</h2>
        <RevenueChart data={chartData} />
      </div>
    </div>
  );
}
