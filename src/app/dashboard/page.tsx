import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const tenantId = await requireTenantId();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { warnDaysBeforeExpiry: true },
  });
  const warnDays = tenant?.warnDaysBeforeExpiry ?? 7;

  const now = new Date();
  const warnDate = new Date(now.getTime() + warnDays * 24 * 60 * 60 * 1000);

  const [members, subscriptions, payments, posSales, expiringSoon] = await Promise.all([
    prisma.member.findMany({ where: { tenantId }, select: { createdAt: true } }),
    prisma.subscription.findMany({
      where: { tenantId },
      select: { startDate: true, endDate: true, status: true },
    }),
    prisma.payment.findMany({
      where: { tenantId, status: "PAID" },
      select: { amount: true, createdAt: true },
    }),
    prisma.pOSSale.findMany({
      where: { tenantId, status: "PAID" },
      select: { total: true, createdAt: true },
    }),
    prisma.subscription.count({
      where: { tenantId, status: "ACTIVE", endDate: { gte: now, lte: warnDate } },
    }),
  ]);

  return (
    <DashboardClient
      members={JSON.parse(JSON.stringify(members))}
      subscriptions={JSON.parse(JSON.stringify(subscriptions))}
      payments={JSON.parse(JSON.stringify(payments))}
      posSales={JSON.parse(JSON.stringify(posSales))}
      warnDays={warnDays}
      expiringSoon={expiringSoon}
    />
  );
}
