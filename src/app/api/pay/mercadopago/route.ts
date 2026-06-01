import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

export async function POST(req: Request) {
  const tenantId = await requireTenantId();
  const { subscriptionId } = await req.json();
  const sub = await prisma.subscription.findFirst({
    where: { id: subscriptionId, tenantId },
    include: { plan: true, member: true, tenant: true },
  });
  if (!sub) return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 });
  if (!sub.tenant.mpAccessToken) return NextResponse.json({ error: "Mercado Pago no configurado" }, { status: 400 });

  const client = new MercadoPagoConfig({ accessToken: sub.tenant.mpAccessToken });
  const pref = new Preference(client);
  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const result = await pref.create({
    body: {
      items: [{
        id: sub.id,
        title: `${sub.plan.name} — ${sub.member.fullName}`,
        quantity: 1,
        currency_id: sub.tenant.currency,
        unit_price: Number(sub.price),
      }],
      metadata: { tenant_id: tenantId, subscription_id: sub.id },
      back_urls: {
        success: `${origin}/dashboard/payments?status=success`,
        failure: `${origin}/dashboard/payments?status=failure`,
        pending: `${origin}/dashboard/payments?status=pending`,
      },
    },
  });
  return NextResponse.json({ url: result.init_point });
}
