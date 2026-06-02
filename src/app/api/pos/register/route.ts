import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

const openSchema = z.object({
  openingCash: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

// GET: caja abierta actual (si existe)
export async function GET() {
  const tenantId = await requireTenantId();
  const open = await prisma.cashRegister.findFirst({
    where: { tenantId, status: "OPEN" },
    orderBy: { openedAt: "desc" },
    include: {
      movements: { orderBy: { createdAt: "desc" } },
      sales: { orderBy: { createdAt: "desc" } },
    },
  });
  return NextResponse.json(open);
}

// POST: abrir caja
export async function POST(req: Request) {
  const tenantId = await requireTenantId();
  const existing = await prisma.cashRegister.findFirst({ where: { tenantId, status: "OPEN" } });
  if (existing) return NextResponse.json({ error: "Ya hay una caja abierta" }, { status: 400 });
  const body = await req.json();
  const parsed = openSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const reg = await prisma.cashRegister.create({
    data: {
      tenantId,
      status: "OPEN",
      openingCash: parsed.data.openingCash,
      notes: parsed.data.notes,
    },
  });
  return NextResponse.json(reg);
}
