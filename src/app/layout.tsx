import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { env } from "@/lib/env";
import { NOMBRE_SITIO } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: { default: NOMBRE_SITIO, template: `%s | ${NOMBRE_SITIO}` },
  description:
    "Tienda de productos naturistas en Cali, barrio Colseguros. Consulta el catálogo con precios y pide por WhatsApp.",
  openGraph: { siteName: NOMBRE_SITIO, locale: "es_CO", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
