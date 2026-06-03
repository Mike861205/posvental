import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isSuperadminSessionActive } from "@/lib/superadmin";

const schema = z.object({
  password: z.string().min(6),
});

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  if (!isSuperadminSessionActive()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Contraseña inválida (mínimo 6 caracteres)" }, { status: 400 });
  }

  const owner = await prisma.user.findFirst({
    where: { tenantId: params.id, role: "OWNER" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!owner) {
    return NextResponse.json({ error: "No se encontró usuario OWNER para este tenant" }, { status: 404 });
  }

  const hashed = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({ where: { id: owner.id }, data: { password: hashed } });

  return NextResponse.json({ ok: true });
}
