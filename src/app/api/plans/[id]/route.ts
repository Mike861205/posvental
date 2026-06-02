import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  durationDays: z.coerce.number().int().min(1),
  active: z.coerce.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const tenantId = await requireTenantId();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const plan = await prisma.plan.findFirst({ where: { id: params.id, tenantId } });
  if (!plan) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const updated = await prisma.plan.update({ where: { id: plan.id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const tenantId = await requireTenantId();
  const p = await prisma.plan.findFirst({ where: { id: params.id, tenantId } });
  if (!p) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  await prisma.plan.delete({ where: { id: p.id } });
  return NextResponse.json({ ok: true });
}
