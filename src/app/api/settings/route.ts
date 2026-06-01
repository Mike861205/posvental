import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

const schema = z.object({
  stripeSecretKey: z.string().optional(),
  stripePublicKey: z.string().optional(),
  mpAccessToken: z.string().optional(),
  currency: z.string().default("MXN"),
});

export async function GET() {
  const tenantId = await requireTenantId();
  const t = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!t) return NextResponse.json({ error: "Tenant" }, { status: 404 });
  return NextResponse.json({
    stripeSecretKey: t.stripeSecretKey ? "•••••••" : "",
    stripePublicKey: t.stripePublicKey ?? "",
    mpAccessToken: t.mpAccessToken ? "•••••••" : "",
    currency: t.currency,
    name: t.name, city: t.city, phone: t.phone,
  });
}

export async function PUT(req: Request) {
  const tenantId = await requireTenantId();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const data: any = { currency: parsed.data.currency };
  if (parsed.data.stripeSecretKey && !parsed.data.stripeSecretKey.includes("•")) {
    data.stripeSecretKey = parsed.data.stripeSecretKey;
  }
  if (parsed.data.stripePublicKey !== undefined) data.stripePublicKey = parsed.data.stripePublicKey;
  if (parsed.data.mpAccessToken && !parsed.data.mpAccessToken.includes("•")) {
    data.mpAccessToken = parsed.data.mpAccessToken;
  }
  await prisma.tenant.update({ where: { id: tenantId }, data });
  return NextResponse.json({ ok: true });
}
