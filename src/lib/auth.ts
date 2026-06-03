import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

async function getTenantBlockedSafe(tenantId: string): Promise<boolean> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { isBlocked: true },
    });
    return !!tenant?.isBlocked;
  } catch {
    // Compatibility fallback when DB schema is not migrated yet.
    return false;
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: creds.email.toLowerCase() },
          include: { tenant: { select: { name: true } } },
        });
        if (!user) return null;

        const isBlocked = await getTenantBlockedSafe(user.tenantId);
        if (isBlocked) return null;

        const ok = await bcrypt.compare(creds.password, user.password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          tenantId: user.tenantId,
          tenantName: user.tenant.name,
          role: user.role,
          tenantBlocked: isBlocked,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.tenantId = (user as any).tenantId;
        token.tenantName = (user as any).tenantName;
        token.role = (user as any).role;
        token.tenantBlocked = (user as any).tenantBlocked;
      }

      if (token.tenantId) {
        token.tenantBlocked = await getTenantBlockedSafe(token.tenantId as string);
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).tenantId = token.tenantId;
      (session as any).tenantName = token.tenantName;
      (session as any).role = token.role;
      (session as any).tenantBlocked = token.tenantBlocked;
      return session;
    },
  },
};
