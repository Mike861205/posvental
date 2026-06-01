import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const tenantId = await requireTenantId();
  const m = await prisma.member.findFirst({ where: { id: params.id, tenantId } });
  if (!m) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  await prisma.member.delete({ where: { id: m.id } });
  return NextResponse.json({ ok: true });
}
