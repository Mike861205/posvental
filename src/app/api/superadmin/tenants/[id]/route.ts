import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSuperadminUser, isSuperadminSessionActive } from "@/lib/superadmin";

const payloadSchema = z.object({
  action: z.enum(["block", "activate", "saveMeta", "markPaid"]),
  blockReason: z.string().optional(),
  superadminNotes: z.string().optional(),
  accessUntil: z.string().optional(),
  monthlyFee: z.coerce.number().min(0).optional(),
  billingMethod: z.enum(["TRANSFER", "STRIPE"]).optional(),
  paymentNote: z.string().optional(),
});

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  try {
    if (!isSuperadminSessionActive()) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { action, blockReason, superadminNotes, accessUntil, monthlyFee, billingMethod, paymentNote } = parsed.data;

    if (action === "block") {
      await prisma.tenant.update({
        where: { id: params.id },
        data: {
          isBlocked: true,
          blockedAt: new Date(),
          blockReason: blockReason?.trim() || "Bloqueado por superadmin",
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "activate") {
      await prisma.tenant.update({
        where: { id: params.id },
        data: {
          isBlocked: false,
          blockedAt: null,
          blockReason: null,
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "markPaid") {
      const tenant = await prisma.tenant.findUnique({
        where: { id: params.id },
        select: { accessUntil: true, monthlyFee: true },
      });

      const now = new Date();
      const baseDate = tenant?.accessUntil && tenant.accessUntil > now ? tenant.accessUntil : now;
      const nextAccessUntil = new Date(baseDate);
      nextAccessUntil.setDate(nextAccessUntil.getDate() + 30);

      const amount = typeof monthlyFee === "number"
        ? monthlyFee
        : Number(tenant?.monthlyFee ?? 0);

      const data: Record<string, unknown> = {
        accessUntil: nextAccessUntil,
        lastPaidAt: now,
        paidCycles: { increment: 1 },
        isBlocked: false,
        blockedAt: null,
        blockReason: null,
      };

      if (billingMethod) data.billingMethod = billingMethod;
      if (typeof monthlyFee === "number") data.monthlyFee = monthlyFee;
      else if (!tenant?.monthlyFee) data.monthlyFee = 0;

      await prisma.$transaction([
        prisma.tenant.update({ where: { id: params.id }, data }),
        prisma.tenantBillingPayment.create({
          data: {
            tenantId: params.id,
            amount,
            method: billingMethod ?? "TRANSFER",
            markedBy: getSuperadminUser(),
            notes: paymentNote?.trim() || null,
          },
        }),
      ]);
      return NextResponse.json({ ok: true, nextAccessUntil });
    }

    await prisma.tenant.update({
      where: { id: params.id },
      data: {
        superadminNotes: superadminNotes ?? null,
        accessUntil: accessUntil ? new Date(accessUntil) : null,
        monthlyFee: typeof monthlyFee === "number" ? monthlyFee : null,
        billingMethod: billingMethod ?? "TRANSFER",
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Error Prisma en actualización de tenant", details: "Verifica npx prisma db push y reinicio del servidor" },
      { status: 500 },
    );
  }
}
