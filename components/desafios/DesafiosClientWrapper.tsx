'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { DesafioConDatos, EquipoSimple, CanchaSimple } from './types';
import { DesafioCard } from './DesafioCard';
import { NuevoDesafioModal } from './NuevoDesafioModal';

interface Props {
  desafios: DesafioConDatos[];
  equipoId: string;
  equipos: EquipoSimple[];
  canchas: CanchaSimple[];
}

type Filtro = 'todos' | 'recibidos' | 'enviados' | 'jugados';

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'recibidos', label: 'Recibidos' },
  { value: 'enviados', label: 'Enviados' },
  { value: 'jugados', label: 'Jugados' },
];

export function DesafiosClientWrapper({ desafios, equipoId, equipos, canchas }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [showModal, setShowModal] = useState(false);
  const [desafiosLocales, setDesafiosLocales] = useState<DesafioConDatos[]>(desafios);
  const [canchaPreseleccionada, setCanchaPreseleccionada] = useState<string | undefined>();
  const [equipoRetadoPreseleccionado, setEquipoRetadoPreseleccionado] = useState<string | undefined>();

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
      if (filtro === 'recibidos') return d.equipo_retado_id === equipoId && d.estado !== 'jugado';
      if (filtro === 'enviados') return d.equipo_retador_id === equipoId && d.estado !== 'jugado';
      if (filtro === 'jugados') return d.estado === 'jugado';
      return true;
    });
  }, [desafiosLocales, filtro, equipoId]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-[#1a1a1f] flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[15px] font-semibold text-[#ddd]">Desafíos</div>
          <div className="text-[11px] text-[#555]">Gestiona los retos de tu equipo</div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#F5C344] text-[#080809] rounded-[8px] px-3 py-1.5 text-[12px] font-semibold hover:bg-[#f0bb30] transition-colors"
        >
          + Nuevo desafío
        </button>
      </div>

      <div className="px-6 pt-4 pb-0 flex gap-1 flex-shrink-0">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`px-3 py-1.5 rounded-[7px] text-[11px] capitalize transition-colors ${
              filtro === f.value ? 'bg-[#F5C34420] text-[#F5C344]' : 'text-[#555] hover:text-[#888]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 pt-4">
        {filtrados.length === 0 ? (
          <div className="text-[#444] text-[12px] text-center py-12">Sin desafíos en esta categoría</div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {filtrados.map((d) => (
              <DesafioCard
                key={d.id}
                desafio={d}
                equipoId={equipoId}
                onEstadoCambiado={(id, estado) =>
                  setDesafiosLocales((prev) => prev.map((x) => (x.id === id ? { ...x, estado } : x)))
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
          canchaPreseleccionada={canchaPreseleccionada}
          equipoRetadoPreseleccionado={equipoRetadoPreseleccionado}
          onClose={() => { setShowModal(false); setCanchaPreseleccionada(undefined); setEquipoRetadoPreseleccionado(undefined); }}
          onSuccess={(d) => {
            setDesafiosLocales((prev) => [d, ...prev]);
            setShowModal(false);
            setCanchaPreseleccionada(undefined);
            setEquipoRetadoPreseleccionado(undefined);
          }}
        />
      )}
    </div>
  );
}
