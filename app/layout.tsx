import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";

const lexend = Lexend({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-lexend',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "King of the Court",
  description: "Desafía equipos, conquista canchas y conviértete en el rey de tu ciudad.",
};

/**
 * Para activar el tema claro añade data-theme="light" al elemento <html>.
 * El tema oscuro (Pro League Asphalt) es el predeterminado.
 * Ver lib/design-tokens.ts para la paleta completa.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`h-full ${lexend.variable}`} suppressHydrationWarning>
      {/* Anti-flash: apply stored theme before first paint */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('kotc-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();` }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
