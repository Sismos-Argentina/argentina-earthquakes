import type { Metadata } from "next";

import "./globals.css";
import "./viewer.css";
import { VIEWER_BOOTSTRAP } from "@/lib/ui/viewer-bootstrap";

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
    <html lang="es" data-layout="cartographic" data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:VIEWER_BOOTSTRAP}}/></head>
      <body>{children}</body>
    </html>
  );
}
