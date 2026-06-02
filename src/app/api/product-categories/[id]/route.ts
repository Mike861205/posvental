import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

const schema = z.object({
  name: z.string().min(1),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const tenantId = await requireTenantId();
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const existing = await prisma.productCategory.findFirst({ where: { id: params.id, tenantId } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const updated = await prisma.productCategory.update({
    where: { id: existing.id },
    data: { name: parsed.data.name.trim() },
  }).catch(() => null);

  if (!updated) {
    return NextResponse.json({ error: "No se pudo actualizar la categoría." }, { status: 400 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const tenantId = await requireTenantId();
  const existing = await prisma.productCategory.findFirst({ where: { id: params.id, tenantId } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.product.updateMany({ where: { tenantId, categoryId: existing.id }, data: { categoryId: null } });
    await tx.productCategory.delete({ where: { id: existing.id } });
  });

  return NextResponse.json({ ok: true });
}
