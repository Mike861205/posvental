import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

const patchSchema = z.object({
  action: z.enum(["markPaid", "changePlan", "setStatus"]).optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "CANCELED"]).optional(),
  planId: z.string().optional(),
  registerPayment: z.boolean().optional(),
  paymentMethod: z.enum(["CASH", "STRIPE", "MERCADOPAGO", "TRANSFER", "OTHER"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const tenantId = await requireTenantId();
  const rawBody = await req.json();
  const parsed = patchSchema.safeParse(rawBody);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const body = parsed.data;
  const sub = await prisma.subscription.findFirst({
    where: { id: params.id, tenantId },
    include: { plan: true },
  });
  if (!sub) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const action = body.action ?? "setStatus";

  if (action === "markPaid") {
    const now = new Date();
    const nextEnd = new Date(sub.endDate > now ? sub.endDate : now);
    nextEnd.setDate(nextEnd.getDate() + sub.plan.durationDays);

    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "ACTIVE",
        endDate: nextEnd,
        payments: {
          create: {
            tenantId,
            amount: sub.price,
            method: body.paymentMethod ?? "CASH",
            status: "PAID",
          },
        },
      },
      include: { member: true, plan: true },
    });
    return NextResponse.json(updated);
  }

  if (action === "changePlan") {
    if (!body.planId) return NextResponse.json({ error: "Plan requerido" }, { status: 400 });

    const newPlan = await prisma.plan.findFirst({
      where: { id: body.planId, tenantId, active: true },
    });
    if (!newPlan) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });

    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + newPlan.durationDays);

    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        planId: newPlan.id,
        price: newPlan.price,
        startDate: start,
        endDate: end,
        status: "ACTIVE",
        ...(body.registerPayment
          ? {
              payments: {
                create: {
                  tenantId,
                  amount: newPlan.price,
                  method: body.paymentMethod ?? "CASH",
                  status: "PAID",
                },
              },
            }
          : {}),
      },
      include: { member: true, plan: true },
    });
    return NextResponse.json(updated);
  }

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: body.status ?? sub.status },
    include: { member: true, plan: true },
  });
  return NextResponse.json(updated);
}
