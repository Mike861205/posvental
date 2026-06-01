import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const tenantId = await requireTenantId();
  const body = await req.json();
  const sub = await prisma.subscription.findFirst({ where: { id: params.id, tenantId } });
  if (!sub) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: body.status ?? sub.status },
  });
  return NextResponse.json(updated);
}
