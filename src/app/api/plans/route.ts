import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  durationDays: z.coerce.number().int().min(1).default(30),
  active: z.coerce.boolean().optional(),
});

export async function GET() {
  const tenantId = await requireTenantId();
  const plans = await prisma.plan.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(plans);
}

export async function POST(req: Request) {
  const tenantId = await requireTenantId();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const plan = await prisma.plan.create({ data: { tenantId, ...parsed.data } });
  return NextResponse.json(plan);
}
