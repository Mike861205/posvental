import { NextResponse } from "next/server";
import { SUPERADMIN_SESSION_COOKIE } from "@/lib/superadmin";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SUPERADMIN_SESSION_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });
  return res;
}
