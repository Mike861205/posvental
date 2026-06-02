import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireTenantId } from "@/lib/session";

type UploadKind = "products" | "members";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE = 4 * 1024 * 1024; // 4MB

const KIND_DIR: Record<UploadKind, string> = {
  products: "products",
  members: "members",
};

function resolveExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mimeType] ?? "png";
}

export async function POST(req: Request, { params }: { params: { kind: string } }) {
  const tenantId = await requireTenantId();

  const kind = params.kind as UploadKind;
  if (!(kind in KIND_DIR)) {
    return NextResponse.json({ error: "Tipo de carga inválido" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Solo imágenes JPG, PNG, WebP o GIF" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "El archivo supera el límite de 4MB" }, { status: 400 });
  }

  const ext = resolveExtension(file.type);
  const filename = `${tenantId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", KIND_DIR[kind]);
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  const url = `/uploads/${KIND_DIR[kind]}/${filename}`;
  return NextResponse.json({ url });
}
