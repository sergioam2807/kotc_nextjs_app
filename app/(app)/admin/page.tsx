import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminPage() {
  const supabase = await createClient();

  // Parallel stats queries
  const nowIso = new Date().toISOString();
  const [
    { count: totalCanchas },
    { count: totalEquipos },
    { count: totalJugadores },
    { count: totalDesafios },
    { data: temporadaActiva },
    { count: eventosVigentes },
  ] = await Promise.all([
    supabase.from('canchas').select('*', { count: 'exact', head: true }),
    supabase.from('equipos').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('desafios').select('*', { count: 'exact', head: true }),
    supabase.from('temporadas').select('id, nombre, inicio, fin').eq('activa', true).maybeSingle(),
    supabase.from('eventos').select('*', { count: 'exact', head: true }).eq('activo', true).lte('fecha_inicio', nowIso).gte('fecha_fin', nowIso),
  ]);

  const stats = [
    { label: 'Canchas registradas', value: totalCanchas ?? 0, emoji: '🏟️', href: '/mapa' },
    { label: 'Equipos activos', value: totalEquipos ?? 0, emoji: '🛡️', href: '/equipos' },
    { label: 'Jugadores registrados', value: totalJugadores ?? 0, emoji: '👤', href: '/jugadores' },
    { label: 'Desafíos totales', value: totalDesafios ?? 0, emoji: '⚔️', href: '/desafios' },
  ];

  return (
    <div>
      {/* Temporada activa */}
      <div className={`rounded-xl p-4 mb-6 border ${
        temporadaActiva
          ? 'bg-accent/10 border-accent/30'
          : 'bg-surface-container-low border-outline-variant'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] text-outline uppercase tracking-wider mb-1 font-medium">
              Temporada activa
            </div>
            {temporadaActiva ? (
              <>
                <div className="text-[16px] font-semibold text-on-surface">
                  🏆 {temporadaActiva.nombre}
                </div>
                <div className="text-[11px] text-on-surface-variant mt-0.5">
                  {new Date(temporadaActiva.inicio).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
                  {' — '}
                  {new Date(temporadaActiva.fin).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </>
            ) : (
              <div className="text-[14px] text-on-surface-variant">Sin temporada activa</div>
            )}
          </div>
          <Link
            href="/admin/temporadas"
            className="px-3 py-1.5 rounded-lg bg-accent text-on-accent text-[12px] font-medium hover:brightness-90 transition-all"
          >
            Gestionar →
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map(stat => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-surface-container-low border border-outline-variant rounded-xl p-4 hover:border-outline transition-colors"
          >
            <div className="text-[24px] mb-2">{stat.emoji}</div>
            <div className="text-[28px] font-bold text-on-surface leading-none mb-1">
              {stat.value.toLocaleString('es-CL')}
            </div>
            <div className="text-[11px] text-on-surface-variant">{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Eventos vigentes badge */}
      {(eventosVigentes ?? 0) > 0 && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-[24px]">🎉</span>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-on-surface">
              {eventosVigentes} evento{eventosVigentes === 1 ? '' : 's'} en curso
            </div>
            <div className="text-[11px] text-on-surface-variant">Visibles en el dashboard de los usuarios</div>
          </div>
          <Link
            href="/admin/eventos"
            className="text-[11px] text-accent hover:underline flex-shrink-0"
          >
            Ver →
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
        <div className="text-[11px] text-outline uppercase tracking-wider mb-3 font-medium">Acciones rápidas</div>
        <div className="flex flex-col gap-2">
          <Link
            href="/admin/temporadas/nueva"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-outline-variant hover:border-outline hover:bg-surface-container transition-colors"
          >
            <span className="text-[18px]">🗓️</span>
            <div>
              <div className="text-[13px] font-medium text-on-surface">Nueva temporada</div>
              <div className="text-[11px] text-on-surface-variant">Crear y activar una nueva temporada competitiva</div>
            </div>
          </Link>
          <Link
            href="/admin/temporadas"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-outline-variant hover:border-outline hover:bg-surface-container transition-colors"
          >
            <span className="text-[18px]">📋</span>
            <div>
              <div className="text-[13px] font-medium text-on-surface">Historial de temporadas</div>
              <div className="text-[11px] text-on-surface-variant">Ver y gestionar todas las temporadas</div>
            </div>
          </Link>
          <Link
            href="/admin/eventos/nuevo"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-outline-variant hover:border-outline hover:bg-surface-container transition-colors"
          >
            <span className="text-[18px]">🎉</span>
            <div>
              <div className="text-[13px] font-medium text-on-surface">Nuevo evento especial</div>
              <div className="text-[11px] text-on-surface-variant">Torneo exprés, bonus XP, reto semanal y más</div>
            </div>
          </Link>
          <Link
            href="/admin/eventos"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-outline-variant hover:border-outline hover:bg-surface-container transition-colors"
          >
            <span className="text-[18px]">⭐</span>
            <div>
              <div className="text-[13px] font-medium text-on-surface">Gestionar eventos</div>
              <div className="text-[11px] text-on-surface-variant">Ver todos los eventos activos e historial</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
