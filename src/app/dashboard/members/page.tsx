import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";
import { MembersClient } from "./members-client";

export default async function MembersPage() {
  const tenantId = await requireTenantId();
  const members = await prisma.member.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: { subscriptions: { orderBy: { endDate: "desc" }, take: 1, include: { plan: true } } },
  });
  return <MembersClient initialMembers={JSON.parse(JSON.stringify(members))} />;
}
