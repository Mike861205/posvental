import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const tenantId = await requireTenantId();
  const p = await prisma.plan.findFirst({ where: { id: params.id, tenantId } });
  if (!p) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  await prisma.plan.delete({ where: { id: p.id } });
  return NextResponse.json({ ok: true });
}
