import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// Deduplicates getServerSession calls within a single request render tree
export const getSession = cache(() => getServerSession(authOptions));

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session as any;
}

export async function requireTenantId(): Promise<string> {
  const s = await requireSession();
  if (!s.tenantId) redirect("/login");

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: s.tenantId as string },
      select: { isBlocked: true },
    });
    if (tenant?.isBlocked) redirect("/login?blocked=1");
  } catch {
    // Compatibility fallback when DB schema is not migrated yet.
  }

  return s.tenantId as string;
}
