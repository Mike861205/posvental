import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return session as any;
}

export async function requireTenantId(): Promise<string> {
  const s = await requireSession();
  if (!s.tenantId) redirect("/login");
  return s.tenantId as string;
}
