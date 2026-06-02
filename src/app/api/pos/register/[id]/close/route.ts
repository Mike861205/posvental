import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

const schema = z.object({
  closingCash: z.coerce.number().min(0),
  notes: z.string().optional(),
});

// POST /api/pos/register/[id]/close — corte de caja
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const tenantId = await requireTenantId();
  const reg = await prisma.cashRegister.findFirst({
    where: { id: params.id, tenantId },
    include: { movements: true, sales: true },
  });
  if (!reg) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (reg.status === "CLOSED") return NextResponse.json({ error: "La caja ya está cerrada" }, { status: 400 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  // Calcular efectivo esperado
  const cashSales = reg.sales
    .filter((s) => s.method === "CASH" && s.status === "PAID")
    .reduce((acc, s) => acc + Number(s.total), 0);
  const incomes = reg.movements
    .filter((m) => m.type === "INCOME" && m.method === "CASH")
    .reduce((acc, m) => acc + Number(m.amount), 0);
  const expenses = reg.movements
    .filter((m) => m.type === "EXPENSE" && m.method === "CASH")
    .reduce((acc, m) => acc + Number(m.amount), 0);
  const expected = Number(reg.openingCash) + cashSales + incomes - expenses;
  const difference = parsed.data.closingCash - expected;

  const closed = await prisma.cashRegister.update({
    where: { id: reg.id },
    data: {
      status: "CLOSED",
      closingCash: parsed.data.closingCash,
      expectedCash: expected,
      difference,
      notes: parsed.data.notes ?? reg.notes,
      closedAt: new Date(),
    },
  });
  return NextResponse.json(closed);
}
