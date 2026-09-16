import dynamic from 'next/dynamic';
import type { CanchaConEstado } from './MapaClientWrapper';

interface Props {
  canchas: CanchaConEstado[];
  onSelectCancha: (c: CanchaConEstado, origen?: { x: number; y: number } | null) => void;
  modoAgregar?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  panToCoords?: { lat: number; lng: number } | null;
  selectedId?: string | null;
}

const MapaGoogle = dynamic(() => import('./MapaGoogle'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface-container-low">
      <span className="text-outline text-[12px]">Cargando mapa...</span>
    </div>
  ),
});

export function MapaTerritorial(props: Props) {
  return <MapaGoogle {...props} />;
}
