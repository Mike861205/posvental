import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

const schema = z.object({
  name: z.string().min(1).optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  currency: z.string().default("MXN"),
  warnDaysBeforeExpiry: z.coerce.number().int().min(1).max(30).default(5),
  stripeSecretKey: z.string().optional(),
  stripePublicKey: z.string().optional(),
  mpAccessToken: z.string().optional(),
});

export async function GET() {
  const tenantId = await requireTenantId();
  const t = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!t) return NextResponse.json({ error: "Tenant" }, { status: 404 });
  return NextResponse.json({
    name: t.name,
    city: t.city ?? "",
    phone: t.phone ?? "",
    currency: t.currency,
    logoUrl: t.logoUrl ?? null,
    warnDaysBeforeExpiry: t.warnDaysBeforeExpiry,
    hasStripe: !!t.stripeSecretKey,
    stripePublicKey: t.stripePublicKey ?? "",
    hasMP: !!t.mpAccessToken,
  });
}

export async function PUT(req: Request) {
  const tenantId = await requireTenantId();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { name, city, phone, currency, warnDaysBeforeExpiry, stripeSecretKey, stripePublicKey, mpAccessToken } = parsed.data;

  const data: Record<string, unknown> = { currency, warnDaysBeforeExpiry };
  if (name) data.name = name;
  if (city !== undefined) data.city = city;
  if (phone !== undefined) data.phone = phone;
  if (stripePublicKey !== undefined) data.stripePublicKey = stripePublicKey;
  if (stripeSecretKey && !stripeSecretKey.includes("•")) data.stripeSecretKey = stripeSecretKey;
  if (mpAccessToken && !mpAccessToken.includes("•")) data.mpAccessToken = mpAccessToken;

  await prisma.tenant.update({ where: { id: tenantId }, data });
  return NextResponse.json({ ok: true });
}
