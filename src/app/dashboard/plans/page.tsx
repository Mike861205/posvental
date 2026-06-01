import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";
import { PlansClient } from "./plans-client";

export default async function PlansPage() {
  const tenantId = await requireTenantId();
  const plans = await prisma.plan.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  return <PlansClient initialPlans={JSON.parse(JSON.stringify(plans))} />;
}
