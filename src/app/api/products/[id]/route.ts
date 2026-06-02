import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

const schema = z.object({
  name: z.string().min(1).optional(),
  imageUrl: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  cost: z.coerce.number().min(0).optional(),
  price: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0).optional(),
  stockDelta: z.coerce.number().int().min(1).optional(),
  featured: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const tenantId = await requireTenantId();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const existing = await prisma.product.findFirst({ where: { id: params.id, tenantId } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (parsed.data.categoryId) {
    const category = await prisma.productCategory.findFirst({ where: { id: parsed.data.categoryId, tenantId } });
    if (!category) return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
  }

  const { stockDelta, ...rest } = parsed.data;
  const data = {
    ...rest,
    ...(typeof stockDelta === "number" ? { stock: existing.stock + stockDelta } : {}),
  };

  const updated = await prisma.product.update({ where: { id: existing.id }, data, include: { category: true } });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const tenantId = await requireTenantId();
  const existing = await prisma.product.findFirst({ where: { id: params.id, tenantId } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  await prisma.product.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
