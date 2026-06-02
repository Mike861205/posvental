import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/session";

const itemSchema = z.object({
  productId: z.string(),
  quantity: z.coerce.number().int().min(1),
});

const schema = z.object({
  items: z.array(itemSchema).min(1),
  method: z.enum(["CASH", "CARD", "TRANSFER", "CREDIT"]),
  customer: z.string().optional(),
  discount: z.coerce.number().min(0).default(0),
  cashReceived: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const tenantId = await requireTenantId();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });

  const reg = await prisma.cashRegister.findFirst({ where: { tenantId, status: "OPEN" } });

  // Cargar productos
  const productIds = parsed.data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, tenantId } });
  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "Producto inválido" }, { status: 400 });
  }

  let subtotal = 0;
  const itemsData = parsed.data.items.map((i) => {
    const p = products.find((x) => x.id === i.productId)!;
    const price = Number(p.price);
    const total = price * i.quantity;
    subtotal += total;
    return {
      productId: p.id,
      name: p.name,
      price,
      quantity: i.quantity,
      total,
    };
  });

  const total = Math.max(0, subtotal - parsed.data.discount);
  const status = parsed.data.method === "CREDIT" ? "CREDIT" : "PAID";
  const cashReceived = parsed.data.method === "CASH" ? parsed.data.cashReceived ?? total : null;
  const changeGiven = cashReceived === null ? null : Math.max(0, cashReceived - total);

  const sale = await prisma.pOSSale.create({
    data: {
      tenantId,
      registerId: reg?.id,
      customer: parsed.data.customer,
      subtotal,
      discount: parsed.data.discount,
      total,
      method: parsed.data.method as any,
      status: status as any,
      cashReceived: cashReceived ?? undefined,
      changeGiven: changeGiven ?? undefined,
      notes: parsed.data.notes,
      items: { create: itemsData },
    },
    include: { items: true },
  });

  // Descontar stock
  await Promise.all(
    parsed.data.items.map((i) =>
      prisma.product.update({
        where: { id: i.productId },
        data: { stock: { decrement: i.quantity } },
      })
    )
  );

  return NextResponse.json(sale);
}
