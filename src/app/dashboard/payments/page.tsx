import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";
import { PaymentsClient } from "./payments-client";

export default async function PaymentsPage() {
  const tenantId = await requireTenantId();
  const payments = await prisma.payment.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      subscription: {
        include: {
          member: { select: { fullName: true } },
          plan: { select: { name: true } },
        },
      },
    },
  });
  return <PaymentsClient payments={JSON.parse(JSON.stringify(payments))} />;
}
