import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";
import { POSClient } from "./pos-client";

export default async function POSPage() {
  const tenantId = await requireTenantId();
  const [products, register, members, topSelling] = await Promise.all([
    prisma.product.findMany({ where: { tenantId, active: true }, orderBy: { name: "asc" }, include: { category: true } }),
    prisma.cashRegister.findFirst({
      where: { tenantId, status: "OPEN" },
      include: {
        movements: { orderBy: { createdAt: "desc" } },
        sales: { orderBy: { createdAt: "desc" }, include: { items: true } },
      },
    }),
    prisma.member.findMany({
      where: { tenantId },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
    prisma.pOSSaleItem.groupBy({
      by: ["productId"],
      where: { sale: { tenantId } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 12,
    }),
  ]);

  const topSellingIds = topSelling.map((item) => item.productId);
  return (
    <POSClient
      initialProducts={JSON.parse(JSON.stringify(products))}
      initialRegister={register ? JSON.parse(JSON.stringify(register)) : null}
      initialMembers={JSON.parse(JSON.stringify(members))}
      topSellingIds={topSellingIds}
    />
  );
}
