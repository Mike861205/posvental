import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "posexercise.com — SaaS de Suscripciones",
  description: "Administra suscripciones de gym, zumba, crossfit y más.",
  icons: {
    icon: "/logos/posexercise-logo.png",
    shortcut: "/logos/posexercise-logo.png",
    apple: "/logos/posexercise-logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
