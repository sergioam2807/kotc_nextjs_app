import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/Badge';
import { TablaLiga } from '@/components/ligas/TablaLiga';
import { BracketView } from '@/components/ligas/BracketView';
import { PartidoCard } from '@/components/ligas/PartidoCard';
import { computeTabla, computeTablaByGrupo } from '@/lib/ligas/tabla';
import Link from 'next/link';

// Supabase sometimes returns FK-joined objects as single obj or array depending
// on how types are inferred without generated types. This helper normalises it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap<T>(v: T | T[]): T | null {
  if (Array.isArray(v)) return (v as T[])[0] ?? null;
  return v ?? null;
}

const DEPORTE_EMOJI: Record<string, string> = {
  basketball: '🏀', futbol: '⚽', voleibol: '🏐', tenis: '🎾', padel: '🏓',
};
const FORMATO_LABEL: Record<string, string> = {
  round_robin:         'Liga todos vs todos',
  eliminacion_directa: 'Eliminación directa',
  grupos_playoffs:     'Grupos + playoffs',
};
const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador', inscripciones: 'Inscripciones abiertas',
  en_curso: 'En curso', finalizada: 'Finalizada', cancelada: 'Cancelada',
};
const ESTADO_VARIANT: Record<string, 'accent' | 'primary' | 'green' | 'neutral' | 'error'> = {
  borrador: 'neutral', inscripciones: 'primary', en_curso: 'green',
  finalizada: 'neutral', cancelada: 'error',
};

interface EquipoRow { id: string; nombre: string; color: string; ciudad?: string | null }
interface LigaEquipoRow {
  id: string; equipo_id: string; estado: string;
  grupo?: string | null; seed?: number | null;
  equipos: EquipoRow | EquipoRow[];
}
interface PartidoRaw {
  id: string; ronda: number; fase: string; grupo?: string | null;
  estado: string; fecha?: string | null;
  puntos_local?: number | null; puntos_visitante?: number | null; ganador_id?: string | null;
  equipo_local?: EquipoRow | EquipoRow[] | null;
  equipo_visitante?: EquipoRow | EquipoRow[] | null;
}

export default async function LigaPublicaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: ligaRaw } = await supabase
    .from('ligas')
    .select(`
      id, nombre, descripcion, deporte, modalidad, formato, estado, max_equipos,
      fecha_inicio, fecha_fin, inscripcion_publica, organizador_id,
      puntos_victoria, puntos_empate, puntos_derrota, num_grupos, equipos_clasifican,
      liga_equipos(id, equipo_id, estado, grupo, seed, equipos(id, nombre, color, ciudad))
    `)
    .eq('id', id)
    .maybeSingle();

  if (!ligaRaw) {
    return (
      <div className="p-6 text-center">
        <p className="text-[15px] text-on-surface-variant">Liga no encontrada.</p>
        <Link href="/ligas" className="text-[13px] text-accent hover:underline mt-3 inline-block">← Volver</Link>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const liga = ligaRaw as any;
  const ligaEquiposRaw: LigaEquipoRow[] = liga.liga_equipos ?? [];
  const aceptados = ligaEquiposRaw.filter(le => le.estado === 'aceptado');

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

  const partidos: PartidoRaw[] = partidosRaw ?? [];

  const esOrganizador = user?.id === liga.organizador_id;

  // Standings
  const config = {
    puntos_victoria: liga.puntos_victoria as number,
    puntos_empate:   liga.puntos_empate   as number,
    puntos_derrota:  liga.puntos_derrota  as number,
  };

  const equiposTabla = aceptados.map(le => {
    const eq = unwrap(le.equipos) as EquipoRow;
    return { id: le.equipo_id, nombre: eq?.nombre ?? '?', color: eq?.color ?? '#888', grupo: le.grupo ?? undefined };
  });

  const partidosForTabla = partidos.map(p => ({
    equipo_local_id:     unwrap(p.equipo_local)?.id ?? null,
    equipo_visitante_id: unwrap(p.equipo_visitante)?.id ?? null,
    puntos_local:        p.puntos_local ?? null,
    puntos_visitante:    p.puntos_visitante ?? null,
    estado:              p.estado,
    grupo:               p.grupo ?? null,
  }));

  const tablaRR     = liga.formato === 'round_robin'
    ? computeTabla(equiposTabla, partidosForTabla, config)
    : [];
  const tablaGrupos = liga.formato === 'grupos_playoffs'
    ? computeTablaByGrupo(
        equiposTabla.filter(e => e.grupo) as { id: string; nombre: string; color: string; grupo: string }[],
        partidosForTabla,
        config,
      )
    : {};

  // Normalise partidos for components
  const partidosNorm = partidos.map(p => ({
    ...p,
    equipo_local:     unwrap(p.equipo_local)     ?? undefined,
    equipo_visitante: unwrap(p.equipo_visitante) ?? undefined,
  }));

  const partidosBracket   = partidosNorm.filter(p => !['regular', 'grupos'].includes(p.fase));
  const partidosRegulares = partidosNorm.filter(p =>  ['regular', 'grupos'].includes(p.fase));
  const completados       = [...partidosRegulares].filter(p => p.estado === 'completado').reverse().slice(0, 5);
  const proximos          = partidosRegulares.filter(p => p.estado === 'pendiente').slice(0, 5);

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <Link href="/ligas" className="inline-flex items-center gap-1.5 text-[13px] text-on-surface-variant hover:text-on-surface transition-colors mb-5">
        ← Ligas
      </Link>

      {/* Hero */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="text-[36px] flex-shrink-0">{DEPORTE_EMOJI[liga.deporte] ?? '🏟️'}</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] font-semibold text-on-surface truncate">{liga.nombre}</h1>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant={ESTADO_VARIANT[liga.estado] ?? 'neutral'}>{ESTADO_LABEL[liga.estado] ?? liga.estado}</Badge>
              <Badge variant="neutral">{liga.modalidad}</Badge>
              <Badge variant="neutral">{FORMATO_LABEL[liga.formato] ?? liga.formato}</Badge>
            </div>
            {liga.descripcion && (
              <p className="text-[12px] text-on-surface-variant mt-2 leading-relaxed">{liga.descripcion}</p>
            )}
            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px] text-on-surface-variant">{aceptados.length}/{liga.max_equipos} equipos</span>
              {liga.fecha_inicio && liga.fecha_fin && (
                <span className="text-[11px] text-outline">
                  {new Date(liga.fecha_inicio).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                  {' – '}
                  {new Date(liga.fecha_fin).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>
        {esOrganizador && (
          <div className="mt-3 pt-3 border-t border-outline-variant">
            <Link href={`/ligas/${liga.id}/admin`} className="text-[12px] text-accent hover:underline font-medium">
              ✎ Panel de administración →
            </Link>
          </div>
        )}
      </div>

      {/* Tabla Round-Robin */}
      {liga.formato === 'round_robin' && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
          <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.1em] font-medium mb-3">Tabla de posiciones</div>
          <TablaLiga rows={tablaRR} />
        </div>
      )}

      {/* Tablas por grupo */}
      {liga.formato === 'grupos_playoffs' && Object.keys(tablaGrupos).length > 0 && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
          <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.1em] font-medium mb-4">Fase de grupos</div>
          <div className="flex flex-col gap-5">
            {Object.entries(tablaGrupos).map(([grupo, rows]) => (
              <TablaLiga key={grupo} rows={rows} titulo={`Grupo ${grupo}`} equiposClasifican={liga.equipos_clasifican ?? 2} />
            ))}
          </div>
        </div>
      )}

      {/* Bracket */}
      {(liga.formato === 'eliminacion_directa' || liga.formato === 'grupos_playoffs') && partidosBracket.length > 0 && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
          <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.1em] font-medium mb-4">
            {liga.formato === 'grupos_playoffs' ? 'Fase de playoffs' : 'Bracket'}
          </div>
          <BracketView partidos={partidosBracket} />
        </div>
      )}

      {/* Próximos */}
      {proximos.length > 0 && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
          <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.1em] font-medium mb-3">Próximos partidos</div>
          <div className="flex flex-col gap-2">
            {proximos.map(p => <PartidoCard key={p.id} partido={p} compact />)}
          </div>
        </div>
      )}

      {/* Recientes */}
      {completados.length > 0 && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 mb-4">
          <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.1em] font-medium mb-3">Resultados recientes</div>
          <div className="flex flex-col gap-2">
            {completados.map(p => <PartidoCard key={p.id} partido={p} compact />)}
          </div>
        </div>
      )}

      {/* Equipos */}
      {aceptados.length > 0 && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
          <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.1em] font-medium mb-3">
            Equipos participantes ({aceptados.length})
          </div>
          <div className="flex flex-col gap-1.5">
            {aceptados.map(le => {
              const eq = unwrap(le.equipos) as EquipoRow;
              if (!eq) return null;
              const ini = eq.nombre.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
              return (
                <Link
                  key={le.equipo_id}
                  href={`/equipos/${le.equipo_id}`}
                  className="bg-surface-container border border-outline-variant rounded-lg p-3 flex items-center gap-3 hover:border-outline transition-colors"
                >
                  <div className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{ background: `${eq.color}20`, color: eq.color }}>{ini}</div>
                  <span className="flex-1 text-[13px] font-medium text-on-surface truncate">{eq.nombre}</span>
                  {le.grupo && <Badge variant="neutral">Gr. {le.grupo}</Badge>}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {partidos.length === 0 && aceptados.length === 0 && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 text-center">
          <div className="text-[32px] mb-3">📋</div>
          <p className="text-[13px] text-on-surface-variant">
            {liga.estado === 'inscripciones'
              ? 'Inscripciones en curso. Pronto habrá equipos y partidos.'
              : 'Esta liga aún no tiene actividad registrada.'}
          </p>
        </div>
      )}
    </div>
  );
}
