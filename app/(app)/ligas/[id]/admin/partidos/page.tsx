import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ResultadoForm } from '@/components/ligas/admin/ResultadoForm';
import { PartidoCard } from '@/components/ligas/PartidoCard';
import Link from 'next/link';

// Normalise Supabase FK joins that may come back as array or single object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap<T>(v: T | T[]): T | null {
  if (Array.isArray(v)) return (v as T[])[0] ?? null;
  return v ?? null;
}

const FASE_LABEL: Record<string, string> = {
  regular:   'Jornada',
  grupos:    'Fase de grupos',
  octavos:   'Octavos de final',
  cuartos:   'Cuartos de final',
  semifinal: 'Semifinales',
  '3er_lugar': '3er y 4to lugar',
  final:     'Final',
};

export default async function LigaAdminPartidosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: ligaRaw } = await supabase
    .from('ligas')
    .select('id, nombre, organizador_id, estado, formato')
    .eq('id', id)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const liga = ligaRaw as any;
  if (!liga || liga.organizador_id !== user.id) redirect(`/ligas/${id}`);

  const { data: partidosRaw } = await supabase
    .from('liga_partidos')
    .select(`
      id, ronda, fase, grupo, estado, fecha, puntos_local, puntos_visitante, ganador_id,
      equipo_local:equipos!liga_partidos_equipo_local_id_fkey(id, nombre, color),
      equipo_visitante:equipos!liga_partidos_equipo_visitante_id_fkey(id, nombre, color)
    `)
    .eq('liga_id', id)
    .order('ronda')
    .order('created_at');

  // Normalise joined relations
  type Equipo = { id: string; nombre: string; color: string };
  type Partido = {
    id: string; ronda: number; fase: string; grupo?: string | null;
    estado: string; fecha?: string | null;
    puntos_local?: number | null; puntos_visitante?: number | null; ganador_id?: string | null;
    equipo_local?: Equipo | null; equipo_visitante?: Equipo | null;
  };

  const partidos: Partido[] = (partidosRaw ?? []).map(p => ({
    ...p,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    equipo_local:     unwrap(p.equipo_local as any) as Equipo | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    equipo_visitante: unwrap(p.equipo_visitante as any) as Equipo | null,
  }));

  if (partidos.length === 0) {
    return (
      <div className="p-5 max-w-2xl mx-auto">
        <Link href={`/ligas/${id}/admin`} className="inline-flex items-center gap-1.5 text-[13px] text-on-surface-variant hover:text-on-surface transition-colors mb-5">
          ← Panel admin
        </Link>
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
          <div className="text-[32px] mb-3">📋</div>
          <p className="text-[15px] text-on-surface font-medium mb-1">Sin calendario generado</p>
          <p className="text-[12px] text-on-surface-variant mb-4">Genera el calendario desde el panel de administración.</p>
          <Link href={`/ligas/${id}/admin`} className="text-[13px] text-accent hover:underline">← Volver al panel</Link>
        </div>
      </div>
    );
  }

  // Group by fase / grupo / ronda
  const grupos = new Map<string, Partido[]>();
  for (const p of partidos) {
    const key = p.fase === 'regular' || p.fase === 'grupos'
      ? `${p.fase}||${p.grupo ?? ''}||${p.ronda}`
      : p.fase;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(p);
  }

  const completados = partidos.filter(p => p.estado === 'completado').length;
  const pendientes  = partidos.filter(p => p.estado === 'pendiente').length;

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <Link href={`/ligas/${id}/admin`} className="inline-flex items-center gap-1.5 text-[13px] text-on-surface-variant hover:text-on-surface transition-colors mb-5">
        ← Panel admin
      </Link>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-semibold text-on-surface">Resultados</h1>
          <p className="text-[12px] text-on-surface-variant mt-0.5">{liga.nombre}</p>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-semibold text-on-surface">{completados}/{partidos.length}</div>
          <div className="text-[11px] text-on-surface-variant">completados</div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-surface-container rounded-full overflow-hidden mb-5" style={{ height: '6px' }}>
        <div
          className="bg-accent h-full rounded-full transition-all"
          style={{ width: `${partidos.length > 0 ? Math.round((completados / partidos.length) * 100) : 0}%` }}
        />
      </div>

      <div className="flex flex-col gap-6">
        {[...grupos.entries()].map(([key, grp]) => {
          const first = grp[0];
          const esRegular = first.fase === 'regular' || first.fase === 'grupos';
          const titulo = esRegular
            ? `${FASE_LABEL[first.fase] ?? first.fase}${first.grupo ? ` — Grupo ${first.grupo}` : ''} · Ronda ${first.ronda}`
            : (FASE_LABEL[first.fase] ?? first.fase);

          return (
            <div key={key}>
              <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.08em] font-medium mb-3">{titulo}</div>
              <div className="flex flex-col gap-3">
                {grp.map(p => (
                  <div key={p.id} className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
                    {p.estado === 'completado' ? (
                      <PartidoCard partido={p} compact />
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                          <span className="truncate">{p.equipo_local?.nombre ?? 'Por definir'}</span>
                          <span className="text-outline font-medium mx-2">vs</span>
                          <span className="truncate text-right">{p.equipo_visitante?.nombre ?? 'Por definir'}</span>
                        </div>
                        {p.equipo_local && p.equipo_visitante ? (
                          <ResultadoForm
                            ligaId={id}
                            partidoId={p.id}
                            equipoLocal={p.equipo_local}
                            equipoVisitante={p.equipo_visitante}
                            puntosLocalActual={p.puntos_local}
                            puntosVisitanteActual={p.puntos_visitante}
                          />
                        ) : (
                          <p className="text-[11px] text-on-surface-variant text-center">Equipos pendientes</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {pendientes === 0 && (
        <div className="mt-6 bg-status-libre/10 border border-status-libre/25 rounded-xl p-4 text-center">
          <div className="text-[20px] mb-1">🎉</div>
          <p className="text-[13px] text-status-libre font-semibold">¡Todos los partidos completados!</p>
          <Link href={`/ligas/${id}/admin`} className="text-[12px] text-accent hover:underline mt-1 inline-block">
            ← Volver al panel admin
          </Link>
        </div>
      )}
    </div>
  );
}
