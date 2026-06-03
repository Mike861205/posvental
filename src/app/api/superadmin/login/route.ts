import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSuperadminSessionToken,
  isValidSuperadminCredentials,
  SUPERADMIN_SESSION_COOKIE,
} from "@/lib/superadmin";

const schema = z.object({
  user: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { user, password } = parsed.data;
  if (!isValidSuperadminCredentials(user, password)) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SUPERADMIN_SESSION_COOKIE, getSuperadminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
