import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Sismos Visuales",
  description:
    "Exploración científica e interactiva de la sismicidad de Argentina.",
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
