import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const tenantId = await requireTenantId();
  const members = await prisma.member.findMany({
    where: { tenantId }, orderBy: { createdAt: "desc" },
    include: { subscriptions: { orderBy: { endDate: "desc" }, take: 1, include: { plan: true } } },
  });
  return NextResponse.json(members);
}

export async function POST(req: Request) {
  const tenantId = await requireTenantId();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { fullName, email, phone, birthDate, notes } = parsed.data;
  const member = await prisma.member.create({
    data: {
      tenantId, fullName,
      email: email || null,
      phone: phone || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      notes: notes || null,
    },
  });
  return NextResponse.json(member);
}
