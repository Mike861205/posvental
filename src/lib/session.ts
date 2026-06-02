import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

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
  return s.tenantId as string;
}
