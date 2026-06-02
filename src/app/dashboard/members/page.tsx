import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";
import { MembersClient } from "./members-client";

export default async function MembersPage() {
  const tenantId = await requireTenantId();
  const [members, payments, posSales] = await Promise.all([
    prisma.member.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: { subscriptions: { orderBy: { endDate: "desc" }, take: 1, include: { plan: true } } },
    }),
    prisma.payment.findMany({
      where: { tenantId, status: "PAID" },
      select: {
        amount: true,
        subscription: { select: { memberId: true } },
      },
    }),
    prisma.pOSSale.findMany({
      where: { tenantId, status: { in: ["PAID", "CREDIT"] } },
      select: { customer: true, total: true },
    }),
  ]);

  const subsByMember: Record<string, number> = {};
  for (const p of payments) {
    const memberId = p.subscription?.memberId;
    if (!memberId) continue;
    subsByMember[memberId] = (subsByMember[memberId] ?? 0) + Number(p.amount);
  }

  const posByMember: Record<string, number> = {};
  for (const sale of posSales) {
    const customer = sale.customer ?? "";
    if (!customer.startsWith("member:")) continue;
    const memberId = customer.split("|")[0].replace("member:", "");
    if (!memberId) continue;
    posByMember[memberId] = (posByMember[memberId] ?? 0) + Number(sale.total);
  }

  const enrichedMembers = members.map((m) => {
    const subscriptionsSpend = subsByMember[m.id] ?? 0;
    const posSpend = posByMember[m.id] ?? 0;
    return {
      ...m,
      subscriptionsSpend,
      posSpend,
      totalSpend: subscriptionsSpend + posSpend,
    };
  });

  return <MembersClient initialMembers={JSON.parse(JSON.stringify(enrichedMembers))} />;
}
