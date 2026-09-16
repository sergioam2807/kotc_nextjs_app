import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "King of the Court",
  description: "Desafía equipos, conquista canchas y conviértete en el rey de tu ciudad.",
};

/**
 * Solo modo oscuro (Neon Court) — no hay theme claro ni toggle.
 * Ver lib/design-tokens.ts para la paleta completa.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`h-full ${poppins.variable}`} data-theme="dark">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
