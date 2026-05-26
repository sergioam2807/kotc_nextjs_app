'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { DesafioConDatos, EquipoSimple, CanchaSimple, EstadoDesafio, ResultadoDesafio } from './types';
import type { ProfileSimple, Desafio1v1ConDatos } from '@/components/desafios1v1/types';
import { DesafioCard } from './DesafioCard';
import { NuevoDesafioModal } from './NuevoDesafioModal';

interface Props {
  desafios: DesafioConDatos[];
  equipoId: string;
  equipos: EquipoSimple[];
  canchas: CanchaSimple[];
  jugadores1v1?: ProfileSimple[];
}

type Filtro = 'todos' | 'recibidos' | 'enviados' | 'jugados';

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'recibidos', label: 'Recibidos' },
  { value: 'enviados', label: 'Enviados' },
  { value: 'jugados', label: 'Jugados' },
];

const ESTADOS_JUGADOS: EstadoDesafio[] = ['jugado', 'resultado_pendiente', 'disputado', 'completado'];

export function DesafiosClientWrapper({ desafios, equipoId, equipos, canchas, jugadores1v1 = [] }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [showModal, setShowModal] = useState(false);
  const [desafiosLocales, setDesafiosLocales] = useState<DesafioConDatos[]>(desafios);
  const [canchaPreseleccionada, setCanchaPreseleccionada] = useState<string | undefined>();
  const [equipoRetadoPreseleccionado, setEquipoRetadoPreseleccionado] = useState<string | undefined>();

  function handleRefresh() {
    startTransition(() => router.refresh());
  }

  // Sync local state when server data refreshes (after router.refresh())
  useEffect(() => {
    setDesafiosLocales(desafios);
  }, [desafios]);

  // Auto-open modal if coming from the map with ?cancha=&retado= params
  useEffect(() => {
    const cancha = searchParams.get('cancha') ?? undefined;
    const retado = searchParams.get('retado') ?? undefined;
    if (cancha || retado) {
      setCanchaPreseleccionada(cancha);
      setEquipoRetadoPreseleccionado(retado);
      setShowModal(true);
      router.replace('/desafios');
    }
  }, [searchParams, router]);

  const filtrados = useMemo(() => {
    return desafiosLocales.filter((d) => {
      if (filtro === 'recibidos') return d.equipo_retado_id === equipoId && !ESTADOS_JUGADOS.includes(d.estado);
      if (filtro === 'enviados') return d.equipo_retador_id === equipoId && !ESTADOS_JUGADOS.includes(d.estado);
      if (filtro === 'jugados') return ESTADOS_JUGADOS.includes(d.estado);
      return true;
    });
  }, [desafiosLocales, filtro, equipoId]);

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 sm:px-6 py-4 border-b border-outline-variant flex items-center justify-between gap-3 flex-shrink-0">
        <div className="min-w-0">
          <div className="text-[15px] font-bold text-on-surface">Desafíos</div>
          <div className="text-[11px] text-outline truncate">Gestiona los retos de tu equipo</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isPending}
            title="Actualizar desafíos"
            aria-label="Actualizar desafíos"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isPending ? 'animate-spin' : ''}
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-accent text-on-accent rounded-lg px-3 py-2 text-[12px] font-bold hover:brightness-90 transition-all min-h-[40px] whitespace-nowrap"
          >
            <span className="sm:hidden">+ Nuevo</span>
            <span className="hidden sm:inline">+ Nuevo desafío</span>
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 pt-4 pb-0 flex gap-1 flex-shrink-0 overflow-x-auto">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`px-3 py-2 rounded-lg text-[11px] capitalize transition-colors font-medium flex-shrink-0 min-h-[36px] ${
              filtro === f.value ? 'bg-accent/15 text-accent' : 'text-outline hover:text-on-surface-variant'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 sm:p-6 pt-4">
        {filtrados.length === 0 ? (
          <div className="text-outline text-[12px] text-center py-12">Sin desafíos en esta categoría</div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))' }}>
            {filtrados.map((d) => (
              <DesafioCard
                key={d.id}
                desafio={d}
                equipoId={equipoId}
                onEstadoCambiado={(id, estado, resultado) =>
                  setDesafiosLocales((prev) => prev.map((x) =>
                    x.id === id ? { ...x, estado, resultado: resultado ?? x.resultado } : x
                  ))
                }
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <NuevoDesafioModal
          equipoId={equipoId}
          equipos={equipos}
          canchas={canchas}
          jugadores1v1={jugadores1v1}
          canchaPreseleccionada={canchaPreseleccionada}
          equipoRetadoPreseleccionado={equipoRetadoPreseleccionado}
          onClose={() => { setShowModal(false); setCanchaPreseleccionada(undefined); setEquipoRetadoPreseleccionado(undefined); }}
          onSuccess={(d) => {
            setDesafiosLocales((prev) => [d, ...prev]);
            setShowModal(false);
            setCanchaPreseleccionada(undefined);
            setEquipoRetadoPreseleccionado(undefined);
          }}
          onSuccess1v1={() => {
            // 1v1 created from within team desafios modal — refresh to show in 1v1 section
            setShowModal(false);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}
