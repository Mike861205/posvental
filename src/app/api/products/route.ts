import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

const schema = z.object({
  name: z.string().min(1),
  imageUrl: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  cost: z.coerce.number().min(0).default(0),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0).default(0),
  featured: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),
});

export async function GET() {
  const tenantId = await requireTenantId();
  const products = await prisma.product.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const tenantId = await requireTenantId();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });

  if (parsed.data.categoryId) {
    const category = await prisma.productCategory.findFirst({ where: { id: parsed.data.categoryId, tenantId } });
    if (!category) return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      tenantId,
      name: parsed.data.name,
      imageUrl: parsed.data.imageUrl || null,
      code: parsed.data.code || null,
      categoryId: parsed.data.categoryId || null,
      cost: parsed.data.cost,
      price: parsed.data.price,
      stock: parsed.data.stock,
      featured: parsed.data.featured ?? false,
      active: parsed.data.active ?? true,
    },
    include: { category: true },
  });
  return NextResponse.json(product);
}
