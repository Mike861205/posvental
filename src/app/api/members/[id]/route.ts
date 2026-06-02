import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

const schema = z.object({
  fullName: z.string().min(2).optional(),
  photoUrl: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const tenantId = await requireTenantId();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });

  const existing = await prisma.member.findFirst({ where: { id: params.id, tenantId } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const data = {
    ...(parsed.data.fullName !== undefined ? { fullName: parsed.data.fullName } : {}),
    ...(parsed.data.photoUrl !== undefined ? { photoUrl: parsed.data.photoUrl || null } : {}),
    ...(parsed.data.email !== undefined ? { email: parsed.data.email || null } : {}),
    ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone || null } : {}),
    ...(parsed.data.birthDate !== undefined ? { birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : null } : {}),
    ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes || null } : {}),
  };

  const updated = await prisma.member.update({ where: { id: existing.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const tenantId = await requireTenantId();
  const m = await prisma.member.findFirst({ where: { id: params.id, tenantId } });
  if (!m) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  await prisma.member.delete({ where: { id: m.id } });
  return NextResponse.json({ ok: true });
}
