import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

const schema = z.object({
  name: z.string().min(1),
});

export async function GET() {
  const tenantId = await requireTenantId();
  const categories = await prisma.productCategory.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const tenantId = await requireTenantId();
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  }

  const category = await prisma.productCategory.create({
    data: {
      tenantId,
      name: parsed.data.name.trim(),
    },
  }).catch(() => null);

  if (!category) {
    return NextResponse.json({ error: "No se pudo crear la categoría. Verifica que no esté repetida." }, { status: 400 });
  }

  return NextResponse.json(category);
}
