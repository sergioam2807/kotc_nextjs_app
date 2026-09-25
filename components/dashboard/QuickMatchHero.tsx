import Link from 'next/link';

/**
 * CTA principal del dashboard hacia el flujo de Partido Rápido (3v3
 * basketball). Se muestra siempre — a diferencia del grid "Desafiar /
 * Buscar rival", no depende de tener un equipo formal: el trío se arma al
 * instante con quien esté en la cancha (ver app/(app)/partido-rapido/page.tsx).
 */
export function QuickMatchHero() {
  return (
    <Link
      href="/partido-rapido"
      className="kotc-btn-press block relative overflow-hidden rounded-xl p-4 sm:p-5 bg-accent text-on-accent hover:brightness-95 transition-[filter]"
    >
      <span className="absolute top-3.5 right-3.5 text-[9px] font-bold tracking-[0.06em] uppercase bg-on-accent/15 px-2 py-0.5 rounded-full">
        Nuevo
      </span>
      <div className="text-[11px] font-bold uppercase tracking-[0.06em] opacity-75">
        🏀 Modo flagship
      </div>
      <div className="text-[20px] sm:text-[21px] font-black leading-tight mt-1">
        ⚡ Partido Rápido 3v3
      </div>
      <p className="text-[12px] font-medium opacity-85 mt-1 mb-3 max-w-sm">
        Llegaste a la cancha y no tienes equipo completo. Arma un 3v3 al instante y desafía en minutos.
      </p>
      <div className="inline-flex items-center gap-1.5 text-[13px] font-bold bg-on-accent text-accent rounded-lg px-4 py-2.5">
        Armar partido ahora →
      </div>
    </Link>
  );
}
