import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    tenantId?: string;
    tenantName?: string;
    role?: string;
    tenantBlocked?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId?: string;
    tenantName?: string;
    role?: string;
    tenantBlocked?: boolean;
  }
}
