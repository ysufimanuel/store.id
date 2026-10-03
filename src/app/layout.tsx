import { Providers } from "@/components/providers";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERP Mini — POS, Finance & Toko Online",
  description:
    "Aplikasi bisnis all-in-one: kasir (POS), manajemen stok & logistik, pembukuan keuangan otomatis, dan toko online.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
