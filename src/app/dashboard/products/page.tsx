import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";
import { ProductsClient } from "./products-client";

export default async function ProductsPage() {
  const tenantId = await requireTenantId();
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, include: { category: true } }),
    prisma.productCategory.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
  ]);
  return (
    <ProductsClient
      initialProducts={JSON.parse(JSON.stringify(products))}
      initialCategories={JSON.parse(JSON.stringify(categories))}
    />
  );
}
