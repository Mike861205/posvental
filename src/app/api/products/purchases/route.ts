import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

const purchaseItemSchema = z.object({
  productId: z.string().min(1),
  stockDelta: z.coerce.number().int().min(1),
  cost: z.coerce.number().min(0).optional(),
});

const schema = z.object({
  purchases: z.array(purchaseItemSchema).min(1),
});

export async function POST(req: Request) {
  const tenantId = await requireTenantId();
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  const uniqueProductIds = new Set<string>();
  for (const item of parsed.data.purchases) {
    if (uniqueProductIds.has(item.productId)) {
      return NextResponse.json({ error: "No repitas productos en la misma compra" }, { status: 400 });
    }
    uniqueProductIds.add(item.productId);
  }

  const updatedProducts = await prisma.$transaction(async (tx) => {
    const updated: Array<{
      id: string;
      name: string;
      code: string | null;
      categoryId: string | null;
      category: { id: string; name: string } | null;
      cost: unknown;
      price: unknown;
      stock: number;
      featured: boolean;
      active: boolean;
    }> = [];

    for (const item of parsed.data.purchases) {
      const existing = await tx.product.findFirst({
        where: { id: item.productId, tenantId },
      });

      if (!existing) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const nextData = {
        stock: existing.stock + item.stockDelta,
        ...(typeof item.cost === "number" ? { cost: item.cost } : {}),
      };

      const product = await tx.product.update({
        where: { id: existing.id },
        data: nextData,
        select: {
          id: true,
          name: true,
          code: true,
          categoryId: true,
          category: { select: { id: true, name: true } },
          cost: true,
          price: true,
          stock: true,
          featured: true,
          active: true,
        },
      });

      updated.push(product);
    }

    return updated;
  }).catch((err: unknown) => {
    if (err instanceof Error && err.message === "PRODUCT_NOT_FOUND") {
      return null;
    }
    throw err;
  });

  if (!updatedProducts) {
    return NextResponse.json({ error: "Producto inválido" }, { status: 404 });
  }

  return NextResponse.json(updatedProducts);
}
