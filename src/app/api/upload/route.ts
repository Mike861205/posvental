import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireTenantId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(req: Request) {
  const tenantId = await requireTenantId();
  const formData = await req.formData();
  const file = formData.get("logo") as File | null;

  if (!file || file.size === 0)
    return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Solo imágenes JPG, PNG, WebP o GIF" }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "El archivo supera el límite de 2MB" }, { status: 400 });

  const extMap: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png",
    "image/webp": "webp", "image/gif": "gif",
  };
  const ext = extMap[file.type] ?? "png";
  const filename = `${tenantId}.${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "logos");
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  const logoUrl = `/logos/${filename}`;
  await prisma.tenant.update({ where: { id: tenantId }, data: { logoUrl } });

  return NextResponse.json({ logoUrl });
}
