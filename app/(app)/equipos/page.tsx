import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/Badge';
import { XPBar } from '@/components/ui/XPBar';
import { nombreNivel } from '@/lib/levels';
import Link from 'next/link';

const DEPORTE_EMOJI: Record<string, string> = {
  basketball: '🏀',
  futbol:     '⚽',
  voleibol:   '🏐',
  tenis:      '🎾',
  padel:      '🏓',
};

const DEPORTE_LABELS: Record<string, string> = {
  basketball: 'Basketball',
  futbol:     'Fútbol',
  voleibol:   'Voleibol',
  tenis:      'Tenis',
  padel:      'Pádel',
};

export default async function EquiposPage() {
  const supabase = await createClient();

  // Current user — check if they already have a team
  const { data: { user } } = await supabase.auth.getUser();
  const { data: userMembresia } = user
    ? await supabase
        .from('equipo_miembros')
        .select('equipo_id')
        .eq('jugador_id', user.id)
        .limit(1)
        .maybeSingle()
    : { data: null };
  const userEquipoId = userMembresia?.equipo_id ?? null;

  // Fetch all teams with member count
  const { data: equiposRaw } = await supabase
    .from('equipos')
    .select('id, nombre, deporte, modalidad, ciudad, color, nivel, xp, equipo_miembros(count)')
    .order('xp', { ascending: false });

  const equipos = equiposRaw ?? [];

  return (
    <div className="p-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-semibold text-on-surface">Equipos</h1>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {equipos.length} equipo{equipos.length !== 1 ? 's' : ''} registrado{equipos.length !== 1 ? 's' : ''}
          </p>
        </div>
        {!userEquipoId && user && (
          <Link
            href="/equipo/crear"
            className="bg-accent text-on-accent text-[12px] font-semibold px-3.5 py-2 rounded-lg hover:brightness-95 transition-all"
          >
            + Crear equipo
          </Link>
        )}
      </div>

      {/* Si no tiene equipo: banner de invitación */}
      {user && !userEquipoId && (
        <div className="bg-accent/8 border border-accent/20 rounded-xl p-4 mb-5 flex items-start gap-3">
          <div className="text-[22px] flex-shrink-0">🏀</div>
          <div>
            <div className="text-[13px] font-semibold text-on-surface mb-0.5">
              ¿Buscas equipo?
            </div>
            <p className="text-[12px] text-on-surface-variant leading-relaxed">
              Haz clic en un equipo para ver su perfil y solicitar unirte. También puedes marcar tu
              perfil como{' '}
              <Link href="/perfil" className="text-accent hover:underline">
                disponible para reclutamiento
              </Link>{' '}
              para que los capitanes te encuentren.
            </p>
          </div>
        </div>
      )}

      {equipos.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
          <div className="text-[32px] mb-3">🏟️</div>
          <p className="text-[15px] text-on-surface font-medium mb-1">No hay equipos aún</p>
          <p className="text-[12px] text-on-surface-variant">
            Sé el primero en crear un equipo.
          </p>
          {user && (
            <Link
              href="/equipo/crear"
              className="inline-block mt-4 text-[13px] text-accent hover:underline"
            >
              Crear equipo →
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {equipos.map(equipo => {
            const color = equipo.color ?? '#F5C344';
            const nivel = equipo.nivel ?? 1;
            const xp = equipo.xp ?? 0;
            const nivelNombre = nombreNivel(nivel);
            const deporteEmoji = DEPORTE_EMOJI[equipo.deporte] ?? '🏟️';
            const deporteLabel = DEPORTE_LABELS[equipo.deporte] ?? equipo.deporte;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const memberCount = (equipo.equipo_miembros as any)?.[0]?.count ?? 0;
            const words = equipo.nombre.trim().split(/\s+/);
            const iniciales = words.length >= 2
              ? (words[0][0] + words[1][0]).toUpperCase()
              : equipo.nombre.slice(0, 2).toUpperCase();
            const esElMio = equipo.id === userEquipoId;

            return (
              <Link
                key={equipo.id}
                href={`/equipos/${equipo.id}`}
                className="block bg-surface-container-low border border-outline-variant rounded-xl p-4 hover:border-outline transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar equipo */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-[15px] font-bold flex-shrink-0 border"
                    style={{ background: `${color}15`, color, borderColor: `${color}40` }}
                  >
                    {iniciales}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[15px] font-semibold truncate"
                        style={{ color }}
                      >
                        {equipo.nombre}
                      </span>
                      {esElMio && <Badge variant="accent">Mi equipo</Badge>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="text-[11px] text-on-surface-variant">
                        {deporteEmoji} {deporteLabel}
                      </span>
                      {equipo.modalidad && (
                        <span className="text-[11px] text-outline">· {equipo.modalidad}</span>
                      )}
                      {equipo.ciudad && (
                        <span className="text-[11px] text-outline">· 📍 {equipo.ciudad}</span>
                      )}
                    </div>
                  </div>

                  {/* Right: nivel + miembros */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-[11px] text-accent font-medium">Lv.{nivel}</div>
                    <div className="text-[11px] text-on-surface-variant mt-0.5">
                      {memberCount} jugador{memberCount !== 1 ? 'es' : ''}
                    </div>
                  </div>
                </div>

                {/* XP bar */}
                <div className="mt-3 pt-2.5 border-t border-outline-variant">
                  <XPBar xp={xp} nivel={nivel} compact />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
