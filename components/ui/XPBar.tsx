'use client';

interface XPBarProps {
  xp: number;
  nivel: number;
  showLabel?: boolean;
  compact?: boolean;
}

function xpParaSiguienteNivel(nivel: number): number {
  const niveles = [0, 200, 500, 1000, 2000, 4000, 7000];
  return niveles[nivel] ?? 7000;
}

function nombreNivel(nivel: number): string {
  const nombres = ['', 'Rookie', 'Contender', 'Challenger', 'Warrior', 'Elite', 'Legend', 'King'];
  return nombres[nivel] ?? 'King';
}

export function XPBar({ xp, nivel, showLabel = true, compact = false }: XPBarProps) {
  const xpActual = xpParaSiguienteNivel(nivel - 1);
  const xpSiguiente = xpParaSiguienteNivel(nivel);
  const porcentaje = Math.min(100, Math.round(((xp - xpActual) / (xpSiguiente - xpActual)) * 100));

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-[#F5C344] font-medium">Lv.{nivel}</span>
        <div className="w-14 h-1 bg-[#1e1e24] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#F5C344] rounded-full transition-all"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="h-1.5 bg-[#1e1e24] rounded-full overflow-hidden mb-1">
        <div
          className="h-full bg-[#F5C344] rounded-full transition-all"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-[10px] text-[#444]">
          {xp} / {xpSiguiente} XP — {nombreNivel(nivel + 1)}
        </p>
      )}
    </div>
  );
}
