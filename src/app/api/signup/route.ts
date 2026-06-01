import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  tenantName: z.string().min(2),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6),
  userName: z.string().optional(),
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }
  const { tenantName, city, phone, email, password, userName } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) return NextResponse.json({ error: "Ese email ya está registrado" }, { status: 409 });

  let slug = slugify(tenantName);
  let i = 1;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    slug = `${slugify(tenantName)}-${i++}`;
  }

  const hashed = await bcrypt.hash(password, 10);
  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName, city, phone, slug,
      users: {
        create: {
          email: email.toLowerCase(),
          password: hashed,
          name: userName ?? tenantName,
          role: "OWNER",
        },
      },
      plans: {
        create: [
          { name: "Mensualidad Gym", price: 500, durationDays: 30, description: "Acceso ilimitado al gimnasio" },
          { name: "Zumba Mensual", price: 350, durationDays: 30, description: "Clases de Zumba" },
          { name: "CrossFit Mensual", price: 800, durationDays: 30, description: "Clases de CrossFit" },
        ],
      },
    },
  });

  return NextResponse.json({ ok: true, tenantId: tenant.id });
}
