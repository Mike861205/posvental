import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";
import { SubsClient } from "./subs-client";

export default async function SubsPage() {
  const tenantId = await requireTenantId();
  const [subs, members, plans] = await Promise.all([
    prisma.subscription.findMany({
      where: { tenantId }, orderBy: { createdAt: "desc" },
      include: { member: true, plan: true },
    }),
    prisma.member.findMany({ where: { tenantId }, orderBy: { fullName: "asc" } }),
    prisma.plan.findMany({ where: { tenantId, active: true }, orderBy: { name: "asc" } }),
  ]);
  return <SubsClient
    initialSubs={JSON.parse(JSON.stringify(subs))}
    members={JSON.parse(JSON.stringify(members))}
    plans={JSON.parse(JSON.stringify(plans))}
  />;
}
