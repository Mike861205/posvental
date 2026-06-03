import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import { getSuperadminSessionToken, SUPERADMIN_SESSION_COOKIE } from "@/lib/superadmin";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    if (pathname.startsWith("/superadmin")) {
      const isLoginPath = pathname === "/superadmin/login";
      const superadminCookie = req.cookies.get(SUPERADMIN_SESSION_COOKIE)?.value;
      const hasSuperadminSession = superadminCookie === getSuperadminSessionToken();

      if (!hasSuperadminSession && !isLoginPath) {
        return NextResponse.redirect(new URL("/superadmin/login", req.url));
      }

      if (hasSuperadminSession && isLoginPath) {
        return NextResponse.redirect(new URL("/superadmin", req.url));
      }
      return NextResponse.next();
    }

    if ((req.nextauth.token as any)?.tenantBlocked) {
      return NextResponse.redirect(new URL("/login?blocked=1", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname;
        if (pathname.startsWith("/superadmin")) return true;
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: ["/dashboard/:path*", "/superadmin/:path*"],
};
