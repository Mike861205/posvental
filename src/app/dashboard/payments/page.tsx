import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function PaymentsPage() {
  const tenantId = await requireTenantId();
  const payments = await prisma.payment.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: { subscription: { include: { member: true, plan: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pagos</h1>
        <p className="text-slate-500">Historial de cobros registrados.</p>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Fecha</th>
              <th className="text-left p-3">Miembro</th>
              <th className="text-left p-3">Plan</th>
              <th className="text-left p-3">Método</th>
              <th className="text-left p-3">Importe</th>
              <th className="text-left p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-400">Aún no hay pagos.</td></tr>}
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="p-3">{formatDate(p.createdAt)}</td>
                <td className="p-3">{p.subscription?.member.fullName ?? "—"}</td>
                <td className="p-3">{p.subscription?.plan.name ?? "—"}</td>
                <td className="p-3">{p.method}</td>
                <td className="p-3 font-medium">{formatCurrency(Number(p.amount))}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    p.status === "PAID" ? "bg-emerald-100 text-emerald-700"
                    : p.status === "PENDING" ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"}`}>{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
