import { NextResponse } from "next/server";
import Stripe from "stripe";
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
  if (!sub.tenant.stripeSecretKey) return NextResponse.json({ error: "Stripe no configurado" }, { status: 400 });

  const stripe = new Stripe(sub.tenant.stripeSecretKey, { apiVersion: "2024-10-28.acacia" as any });
  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: sub.tenant.currency.toLowerCase(),
        product_data: { name: sub.plan.name, description: `Cliente: ${sub.member.fullName}` },
        unit_amount: Math.round(Number(sub.price) * 100),
      },
      quantity: 1,
    }],
    metadata: { tenantId, subscriptionId: sub.id },
    success_url: `${origin}/dashboard/payments?status=success`,
    cancel_url: `${origin}/dashboard/payments?status=cancel`,
  });

  return NextResponse.json({ url: session.url });
}
