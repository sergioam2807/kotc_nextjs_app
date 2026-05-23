import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { XPBar } from '@/components/ui/XPBar';
import { nombreNivel } from '@/lib/levels';
import { DEPORTES_MAP } from '@/lib/player-constants';
import Link from 'next/link';
import { SolicitudActions } from '@/components/equipo/SolicitudActions';

export default async function SolicitudesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Check if user is admin/captain
  const { data: membresia } = await supabase
    .from('equipo_miembros')
    .select('equipo_id, rol')
    .eq('jugador_id', user.id)
    .in('rol', ['admin', 'capitan'])
    .limit(1)
    .maybeSingle();

  if (!membresia) {
    return (
      <div className="p-5 max-w-2xl">
        <h1 className="text-[18px] font-medium text-on-surface mb-4">Solicitudes de ingreso</h1>
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 text-center">
          <div className="text-[32px] mb-3">🔒</div>
          <p className="text-[13px] text-on-surface-variant">
            Solo los administradores y capitanes pueden gestionar solicitudes.
          </p>
        </div>
      </div>
    );
  }

  const { data: solicitudes } = await supabase
    .from('solicitudes_equipo')
    .select(
      'id, jugador_id, mensaje, estado, created_at, profiles(username, display_name, avatar_url, nivel, xp, posicion_principal, especialidades, deportes_activos, ciudad)',
    )
    .eq('equipo_id', membresia.equipo_id)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false });

  const count = solicitudes?.length ?? 0;

  return (
    <div className="p-5 max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-medium text-on-surface">Solicitudes de ingreso</h1>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {count} solicitud{count !== 1 ? 'es' : ''} pendiente{count !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/jugadores" className="text-[12px] text-accent hover:underline">
          Ver jugadores disponibles →
        </Link>
      </div>

      {count === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
          <div className="text-[32px] mb-3">📭</div>
          <p className="text-[15px] text-on-surface font-medium mb-1">Sin solicitudes pendientes</p>
          <p className="text-[12px] text-on-surface-variant mb-4">
            Cuando un jugador solicite unirse a tu equipo, aparecerá aquí.
          </p>
          <Link href="/jugadores" className="text-[13px] text-accent hover:underline">
            Ver jugadores disponibles para reclutar →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(solicitudes ?? []).map(sol => {
            const perfil = Array.isArray(sol.profiles) ? sol.profiles[0] : sol.profiles;
            if (!perfil) return null;

            const nombre = (perfil as { display_name?: string; username: string }).display_name
              ?? (perfil as { username: string }).username;
            const nivel = (perfil as { nivel?: number }).nivel ?? 1;
            const xp = (perfil as { xp?: number }).xp ?? 0;
            const ciudad = (perfil as { ciudad?: string }).ciudad;
            const posicionPrincipal = (perfil as { posicion_principal?: string }).posicion_principal;
            const especialidades: string[] = (perfil as { especialidades?: string[] }).especialidades ?? [];
            const deportesActivos: string[] = (perfil as { deportes_activos?: string[] }).deportes_activos ?? [];
            const avatarUrl = (perfil as { avatar_url?: string }).avatar_url;

            const palabras = nombre.trim().split(/\s+/);
            const iniciales =
              palabras.length >= 2
                ? (palabras[0][0] + palabras[1][0]).toUpperCase()
                : nombre.slice(0, 2).toUpperCase();

            const fechaStr = new Date(sol.created_at).toLocaleDateString('es-CL', {
              day: 'numeric',
              month: 'short',
            });

            return (
              <div
                key={sol.id}
                className="bg-surface-container-low border border-outline-variant rounded-xl p-4"
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
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

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link
                        href={`/jugadores/${sol.jugador_id}`}
                        className="text-[15px] font-semibold text-on-surface hover:underline truncate"
                      >
                        {nombre}
                      </Link>
                      <span className="text-[11px] text-on-surface-variant">{fechaStr}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-accent font-medium">
                        Lv.{nivel} — {nombreNivel(nivel)}
                      </span>
                      {ciudad && (
                        <span className="text-[11px] text-on-surface-variant">📍 {ciudad}</span>
                      )}
                    </div>
                    {posicionPrincipal && (
                      <div className="text-[11px] text-on-surface-variant mt-0.5">
                        📌 {posicionPrincipal}
                      </div>
                    )}
                  </div>
                </div>

                {/* XP Bar */}
                <div className="mb-3">
                  <XPBar xp={xp} nivel={nivel} compact />
                </div>

                {/* Sports + Specialties */}
                {(deportesActivos.length > 0 || especialidades.length > 0) && (
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {deportesActivos.slice(0, 3).map(dep => {
                      const d = DEPORTES_MAP[dep];
                      if (!d) return null;
                      return (
                        <Badge key={dep} variant="neutral">
                          {d.emoji} {d.label}
                        </Badge>
                      );
                    })}
                    {especialidades.slice(0, 3).map(esp => (
                      <Badge key={esp} variant="primary">{esp}</Badge>
                    ))}
                  </div>
                )}

                {/* Message */}
                {sol.mensaje && (
                  <div className="bg-surface-container border border-outline-variant rounded-lg px-3 py-2 mb-3">
                    <div className="text-[10px] text-on-surface-variant uppercase tracking-wide mb-1">Mensaje</div>
                    <p className="text-[12px] text-on-surface leading-relaxed">{sol.mensaje}</p>
                  </div>
                )}

                {/* Actions */}
                <SolicitudActions solicitudId={sol.id} jugadorNombre={nombre} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
