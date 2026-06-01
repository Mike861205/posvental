import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string, currency = "MXN") {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(n || 0);
}

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" });
}
