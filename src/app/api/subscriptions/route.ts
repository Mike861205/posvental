import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

const schema = z.object({
  memberId: z.string(),
  planId: z.string(),
  startDate: z.string().optional(),
  paymentMethod: z.enum(["CASH", "STRIPE", "MERCADOPAGO", "TRANSFER", "OTHER"]).default("CASH"),
});

export async function GET() {
  const tenantId = await requireTenantId();
  const subs = await prisma.subscription.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: { member: true, plan: true },
  });
  return NextResponse.json(subs);
}

export async function POST(req: Request) {
  const tenantId = await requireTenantId();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { memberId, planId, startDate, paymentMethod } = parsed.data;
  const [member, plan] = await Promise.all([
    prisma.member.findFirst({ where: { id: memberId, tenantId } }),
    prisma.plan.findFirst({ where: { id: planId, tenantId } }),
  ]);
  if (!member || !plan) return NextResponse.json({ error: "Miembro o plan inválido" }, { status: 400 });

  const start = startDate ? new Date(startDate) : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + plan.durationDays);

  const sub = await prisma.subscription.create({
    data: {
      tenantId, memberId, planId,
      startDate: start, endDate: end,
      price: plan.price, status: "ACTIVE",
      payments: {
        create: { tenantId, amount: plan.price, method: paymentMethod, status: "PAID" },
      },
    },
    include: { member: true, plan: true },
  });
  return NextResponse.json(sub);
}
