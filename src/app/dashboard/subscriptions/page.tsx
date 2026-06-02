import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";
import { SubsClient } from "./subs-client";

export default async function SubsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const tenantId = await requireTenantId();
  const { filter } = await searchParams;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { warnDaysBeforeExpiry: true },
  });
  const warnDays = tenant?.warnDaysBeforeExpiry ?? 7;

  const [subs, members, plans] = await Promise.all([
    prisma.subscription.findMany({
      where: { tenantId }, orderBy: { createdAt: "desc" },
      include: { member: { select: { id: true, fullName: true } }, plan: { select: { id: true, name: true } } },
    }),
    prisma.member.findMany({ where: { tenantId }, orderBy: { fullName: "asc" } }),
    prisma.plan.findMany({ where: { tenantId, active: true }, orderBy: { name: "asc" } }),
  ]);
  return <SubsClient
    initialSubs={JSON.parse(JSON.stringify(subs))}
    members={JSON.parse(JSON.stringify(members))}
    plans={JSON.parse(JSON.stringify(plans))}
    initialFilter={filter ?? "all"}
    warnDays={warnDays}
  />;
}
