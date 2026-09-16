import { createClient } from '@/lib/supabase/server';
import { CourtDiscoveryPanel } from '@/components/admin/CourtDiscoveryPanel';
import { CanchaModeracionActions } from '@/components/admin/CanchaModeracionActions';

/**
 * Descubrimiento y moderación de canchas.
 *
 * La autorización la aplica `app/(app)/admin/layout.tsx` (ADMIN_EMAIL), igual
 * que el resto del panel: esta página no repite el chequeo.
 */
export default async function AdminCanchasPage() {
  const supabase = await createClient();

  const [{ data: pendientes }, { data: runs }, { count: rechazadas }] = await Promise.all([
    supabase
      .from('canchas')
      .select('id, nombre, direccion, lat, lng, google_place_id, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('cancha_discovery_runs')
      .select('id, zona, lat, lng, radio_m, started_at, found, created, duplicated, errors')
      .order('started_at', { ascending: false })
      .limit(5),
    supabase
      .from('canchas')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'rejected'),
  ]);

  const lista = pendientes ?? [];

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[16px] font-semibold text-on-surface">Descubrimiento de canchas</h2>
        <p className="text-[11px] text-on-surface-variant mt-0.5">
          Google Places se usa solo para encontrar candidatas. Lo que se publica en el mapa es lo que
          vos apruebes.
        </p>
      </div>

      <CourtDiscoveryPanel />

      {/* ── Pendientes de revisión ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] text-outline uppercase tracking-wider font-medium">
          Pendientes de revisión ({lista.length})
        </div>
        {(rechazadas ?? 0) > 0 && (
          <span className="text-[10px] text-outline">{rechazadas} rechazadas</span>
        )}
      </div>

      {lista.length === 0 ? (
        <div className="bg-surface-container-low border border-dashed border-outline-variant rounded-xl p-8 text-center">
          <div className="text-[28px] mb-2">🗺️</div>
          <p className="text-[13px] text-on-surface font-medium mb-1">Nada esperando revisión</p>
          <p className="text-[11px] text-on-surface-variant">
            Buscá una zona acá arriba: las canchas que Google conozca y KOC todavía no, aparecen en esta lista.
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
          {lista.map((c, i) => (
            <div
              key={c.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                i < lista.length - 1 ? 'border-b border-outline-variant' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-on-surface font-medium truncate">{c.nombre}</div>
                <div className="text-[11px] text-on-surface-variant truncate">{c.direccion}</div>
                <div className="flex items-center gap-2 mt-1">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${c.lat}%2C${c.lng}&query_place_id=${c.google_place_id ?? ''}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-primary hover:underline"
                  >
                    Ver en Google Maps ↗
                  </a>
                  <span className="text-[10px] text-outline font-mono">
                    {c.lat.toFixed(4)}, {c.lng.toFixed(4)}
                  </span>
                </div>
              </div>
              <CanchaModeracionActions canchaId={c.id} nombre={c.nombre} />
            </div>
          ))}
        </div>
      )}

      {/* ── Historial de importaciones ── */}
      {(runs?.length ?? 0) > 0 && (
        <div className="mt-8">
          <div className="text-[10px] text-outline uppercase tracking-wider font-medium mb-3">
            Últimas importaciones
          </div>
          <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
            {runs!.map((r, i) => (
              <div
                key={r.id}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 ${
                  i < runs!.length - 1 ? 'border-b border-outline-variant' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="text-[12px] text-on-surface truncate">
                    {r.zona ?? `${r.lat.toFixed(3)}, ${r.lng.toFixed(3)}`}
                    <span className="text-outline"> · {(r.radio_m / 1000).toFixed(1)} km</span>
                  </div>
                  <div className="text-[10px] text-outline">
                    {new Date(r.started_at).toLocaleString('es-CL')}
                  </div>
                </div>
                <div className="text-[11px] text-on-surface-variant flex-shrink-0 font-mono">
                  {r.found} · <span className="text-accent">{r.created} nuevas</span> · {r.duplicated} dup
                  {r.errors > 0 && <span className="text-error"> · {r.errors} err</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-outline mt-6">
        Configuración de la API key y detalle de la deduplicación:{' '}
        <code className="text-on-surface-variant">docs/GOOGLE_PLACES_IMPORT.md</code>
      </p>
    </div>
  );
}
