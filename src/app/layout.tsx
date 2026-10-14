import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Bajo nuestros pies",
  description:
    "Explorá los sismos bajo Argentina y compará San Juan con los Andes del sur: catálogo INPRES, relieve GEBCO y modelo Slab2.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
