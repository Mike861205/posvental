import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSuperadminSessionActive } from "@/lib/superadmin";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

type TenantBase = {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
  createdAt: Date;
};

type TenantFull = TenantBase & {
  isBlocked: boolean;
  blockedAt: Date | null;
  blockReason: string | null;
  superadminNotes: string | null;
  accessUntil: Date | null;
  monthlyFee: unknown;
  billingMethod: "TRANSFER" | "STRIPE";
  lastPaidAt: Date | null;
  paidCycles: number;
};

type TenantPaymentRow = {
  id: string;
  amount: number;
  method: "TRANSFER" | "STRIPE";
  paidAt: Date;
  markedBy: string | null;
};

async function getRecentTenantPaymentsSafe(tenantId: string): Promise<TenantPaymentRow[]> {
  try {
    const payments = await prisma.tenantBillingPayment.findMany({
      where: { tenantId },
      orderBy: { paidAt: "desc" },
      take: 6,
      select: {
        id: true,
        amount: true,
        method: true,
        paidAt: true,
        markedBy: true,
      },
    });

    return payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      paidAt: p.paidAt,
      markedBy: p.markedBy ?? null,
    }));
  } catch {
    return [];
  }
}

async function enrichRows(tenants: Array<TenantBase | TenantFull>) {
  const monthStart = startOfMonth();

  return Promise.all(
    tenants.map(async (tenant) => {
      const [membersCount, activeSubs, totalSubs, paymentsAgg, posSalesAgg, owner, recentPayments] = await Promise.all([
        prisma.member.count({ where: { tenantId: tenant.id } }),
        prisma.subscription.count({ where: { tenantId: tenant.id, status: "ACTIVE" } }),
        prisma.subscription.count({ where: { tenantId: tenant.id } }),
        prisma.payment.aggregate({
          where: { tenantId: tenant.id, createdAt: { gte: monthStart }, status: "PAID" },
          _sum: { amount: true },
        }),
        prisma.pOSSale.aggregate({
          where: { tenantId: tenant.id, createdAt: { gte: monthStart }, status: "PAID" },
          _sum: { total: true },
        }),
        prisma.user.findFirst({
          where: { tenantId: tenant.id, role: "OWNER" },
          orderBy: { createdAt: "asc" },
          select: { name: true, email: true },
        }),
        getRecentTenantPaymentsSafe(tenant.id),
      ]);

      const paymentsMonth = Number(paymentsAgg._sum.amount ?? 0);
      const posSalesMonth = Number(posSalesAgg._sum.total ?? 0);

      const hasSuperadminFields = "isBlocked" in tenant;
      return {
        id: tenant.id,
        name: tenant.name,
        city: tenant.city,
        phone: tenant.phone,
        createdAt: tenant.createdAt,
        ownerName: owner?.name ?? null,
        ownerEmail: owner?.email ?? null,
        isBlocked: hasSuperadminFields ? (tenant as TenantFull).isBlocked : false,
        blockedAt: hasSuperadminFields ? (tenant as TenantFull).blockedAt : null,
        blockReason: hasSuperadminFields ? (tenant as TenantFull).blockReason : null,
        superadminNotes: hasSuperadminFields ? (tenant as TenantFull).superadminNotes : null,
        accessUntil: hasSuperadminFields ? (tenant as TenantFull).accessUntil : null,
        monthlyFee:
          hasSuperadminFields && (tenant as TenantFull).monthlyFee
            ? Number((tenant as TenantFull).monthlyFee)
            : null,
        billingMethod: hasSuperadminFields ? (tenant as TenantFull).billingMethod : "TRANSFER",
        lastPaidAt: hasSuperadminFields ? (tenant as TenantFull).lastPaidAt : null,
        paidCycles: hasSuperadminFields ? (tenant as TenantFull).paidCycles : 0,
        recentPayments,
        metrics: {
          membersCount,
          activeSubs,
          totalSubs,
          paymentsMonth,
          posSalesMonth,
          activityScore: activeSubs + membersCount,
        },
      };
    }),
  );
}

export async function GET() {
  if (!isSuperadminSessionActive()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        city: true,
        phone: true,
        createdAt: true,
        isBlocked: true,
        blockedAt: true,
        blockReason: true,
        superadminNotes: true,
        accessUntil: true,
        monthlyFee: true,
        billingMethod: true,
        lastPaidAt: true,
        paidCycles: true,
      },
    });

    const rows = await enrichRows(tenants as TenantFull[]);
    return NextResponse.json({ tenants: rows });
  } catch {
    try {
      const tenants = await prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          city: true,
          phone: true,
          createdAt: true,
        },
      });
      const rows = await enrichRows(tenants as TenantBase[]);
      return NextResponse.json({
        tenants: rows,
        warning: "Mostrando tenants sin campos avanzados de superadmin. Ejecuta: npx prisma db push",
      });
    } catch {
      return NextResponse.json(
        { error: "Error consultando tenants. Ejecuta: npx prisma db push" },
        { status: 500 },
      );
    }
  }
}
