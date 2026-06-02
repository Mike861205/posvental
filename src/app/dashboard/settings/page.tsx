import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const tenantId = await requireTenantId();
  const t = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!t) return null;
  return <SettingsClient tenant={{
    name: t.name,
    city: t.city ?? "",
    phone: t.phone ?? "",
    currency: t.currency,
    logoUrl: t.logoUrl ?? null,
    warnDaysBeforeExpiry: t.warnDaysBeforeExpiry,
    hasStripe: !!t.stripeSecretKey,
    stripePublicKey: t.stripePublicKey ?? "",
    hasMP: !!t.mpAccessToken,
  }}/>;
}
