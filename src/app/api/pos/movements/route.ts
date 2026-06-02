import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

const schema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  concept: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  method: z.enum(["CASH", "TRANSFER", "OTHER"]).default("CASH"),
});

export async function POST(req: Request) {
  const tenantId = await requireTenantId();
  const reg = await prisma.cashRegister.findFirst({ where: { tenantId, status: "OPEN" } });
  if (!reg) return NextResponse.json({ error: "No hay caja abierta" }, { status: 400 });
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const mov = await prisma.cashMovement.create({
    data: {
      tenantId,
      registerId: reg.id,
      type: parsed.data.type,
      concept: parsed.data.concept,
      amount: parsed.data.amount,
      method: parsed.data.method as any,
    },
  });
  return NextResponse.json(mov);
}
