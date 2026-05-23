import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/Badge';
import { XPBar } from '@/components/ui/XPBar';
import { nombreNivel } from '@/lib/levels';
import { DEPORTES_MAP } from '@/lib/player-constants';
import { InvitarJugadorButton } from '@/components/jugadores/InvitarJugadorButton';
import Link from 'next/link';

export default async function JugadoresPage() {
  const supabase = await createClient();

  // Current viewer — check if they're admin/captain
  const { data: { user } } = await supabase.auth.getUser();
  const { data: viewerMembresia } = user
    ? await supabase
        .from('equipo_miembros')
        .select('equipo_id, rol, equipos(id, nombre)')
        .eq('jugador_id', user.id)
        .in('rol', ['admin', 'capitan'])
        .limit(1)
        .maybeSingle()
    : { data: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerEquipo = viewerMembresia?.equipo_id
    ? { id: viewerMembresia.equipo_id, nombre: (viewerMembresia as any).equipos?.nombre ?? 'Mi equipo' }
    : null;

  const { data: jugadores } = await supabase
    .from('profiles')
    .select(
      'id, username, display_name, avatar_url, nivel, xp, ciudad, bio, posicion_principal, especialidades, deportes_activos, disponible_reclutamiento',
    )
    .eq('disponible_reclutamiento', true)
    .order('xp', { ascending: false })
    .limit(50);

  // Get all player IDs that already have a team
  const { data: miembros } = await supabase
    .from('equipo_miembros')
    .select('jugador_id');

  const conEquipo = new Set((miembros ?? []).map(m => m.jugador_id));
  const disponibles = (jugadores ?? []).filter(j => !conEquipo.has(j.id) && j.id !== user?.id);

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-semibold text-on-surface">Jugadores disponibles</h1>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {disponibles.length} jugador{disponibles.length !== 1 ? 'es' : ''} buscando equipo
          </p>
        </div>
        <Link
          href="/equipos"
          className="text-[11px] text-accent hover:underline font-medium"
        >
          Ver equipos →
        </Link>
      </div>

      {disponibles.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
          <div className="text-[32px] mb-3">🏀</div>
          <p className="text-[15px] text-on-surface font-medium mb-1">Sin jugadores disponibles</p>
          <p className="text-[12px] text-on-surface-variant">
            Aún no hay jugadores marcados como disponibles para reclutamiento.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {disponibles.map(jugador => {
            const nombre = jugador.display_name ?? jugador.username;
            const deportes: string[] = jugador.deportes_activos ?? [];
            const especialidadesSlice: string[] = (jugador.especialidades ?? []).slice(0, 3);
            const nivel = jugador.nivel ?? 1;
            const xp = jugador.xp ?? 0;

            const palabras = nombre.trim().split(/\s+/);
            const iniciales =
              palabras.length >= 2
                ? (palabras[0][0] + palabras[1][0]).toUpperCase()
                : nombre.slice(0, 2).toUpperCase();

            return (
              <div key={jugador.id} className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
                {/* Card clicable (ir al perfil) */}
                <Link href={`/jugadores/${jugador.id}`} className="block hover:opacity-90 transition-opacity">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {jugador.avatar_url ? (
                        <img
                          src={jugador.avatar_url}
                          alt={nombre}
                          className="w-12 h-12 rounded-lg object-cover border border-outline-variant"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center">
                          <span className="text-[16px] font-semibold text-accent">{iniciales}</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[15px] font-semibold text-on-surface truncate">
                          {nombre}
                        </span>
                        <Badge variant="libre">Disponible</Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[11px] text-accent font-medium">
                          Lv.{nivel} — {nombreNivel(nivel)}
                        </span>
                        {jugador.ciudad && (
                          <span className="text-[11px] text-on-surface-variant">
                            📍 {jugador.ciudad}
                          </span>
                        )}
                      </div>
                      {jugador.posicion_principal && (
                        <div className="text-[11px] text-on-surface-variant mb-1">
                          📌 {jugador.posicion_principal}
                        </div>
                      )}
                      {jugador.bio && (
                        <p className="text-[12px] text-on-surface-variant line-clamp-2 mb-2">
                          {jugador.bio}
                        </p>
                      )}
                      <div className="flex gap-1.5 flex-wrap">
                        {deportes.slice(0, 3).map(dep => {
                          const d = DEPORTES_MAP[dep];
                          if (!d) return null;
                          return (
                            <Badge key={dep} variant="neutral">
                              {d.emoji} {d.label}
                            </Badge>
                          );
                        })}
                        {especialidadesSlice.map(esp => (
                          <Badge key={esp} variant="primary">
                            {esp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-outline-variant">
                    <XPBar xp={xp} nivel={nivel} compact />
                  </div>
                </Link>

                {/* Botón Invitar — solo visible para admins/capitanes */}
                {viewerEquipo && (
                  <div className="mt-3">
                    <InvitarJugadorButton
                      equipoId={viewerEquipo.id}
                      equipoNombre={viewerEquipo.nombre}
                      jugadorId={jugador.id}
                      jugadorNombre={nombre}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
