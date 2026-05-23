import { createClient } from '@/lib/supabase/server';
import { LigaCard } from '@/components/ligas/LigaCard';
import Link from 'next/link';

export default async function LigasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Check if current user has an active subscription
  const { data: suscripcion } = user
    ? await supabase
        .from('suscripciones')
        .select('id')
        .eq('user_id', user.id)
        .eq('estado', 'activa')
        .gte('fecha_fin', new Date().toISOString().split('T')[0])
        .maybeSingle()
    : { data: null };

  const puedeCrear = !!suscripcion;

  // Fetch all visible ligas
  const { data: ligas } = await supabase
    .from('ligas')
    .select(`
      id, nombre, deporte, modalidad, formato, estado, max_equipos,
      inscripcion_publica, fecha_inicio, fecha_fin, organizador_id, created_at,
      liga_equipos(count)
    `)
    .order('created_at', { ascending: false });

  const visibles = (ligas ?? []).filter(
    l => l.estado !== 'borrador' || (user && l.organizador_id === user.id)
  );

  const misLigas   = visibles.filter(l => user && l.organizador_id === user.id);
  const otrasLigas = visibles.filter(l => !user || l.organizador_id !== user.id);

  return (
    <div className="p-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-semibold text-on-surface">Ligas</h1>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {visibles.length} liga{visibles.length !== 1 ? 's' : ''} disponible{visibles.length !== 1 ? 's' : ''}
          </p>
        </div>
        {puedeCrear ? (
          <Link
            href="/ligas/nueva"
            className="bg-accent text-on-accent border-none rounded-lg px-4 py-2.5 text-[12px] font-semibold hover:brightness-95 transition-all"
          >
            + Crear liga
          </Link>
        ) : user ? (
          <div className="text-right">
            <div className="text-[12px] text-on-surface-variant">Para crear ligas necesitas</div>
            <div className="text-[12px] text-accent font-medium">una suscripción de organizador</div>
          </div>
        ) : null}
      </div>

      {/* Mis ligas */}
      {misLigas.length > 0 && (
        <div className="mb-6">
          <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.1em] font-medium mb-3">
            Mis ligas
          </div>
          <div className="flex flex-col gap-2">
            {misLigas.map(liga => (
              <LigaCard key={liga.id} liga={liga} esOrganizador />
            ))}
          </div>
        </div>
      )}

      {/* Ligas activas */}
      {otrasLigas.length > 0 ? (
        <div>
          {misLigas.length > 0 && (
            <div className="text-[10px] text-on-surface-variant uppercase tracking-[0.1em] font-medium mb-3">
              Otras ligas
            </div>
          )}
          <div className="flex flex-col gap-2">
            {otrasLigas.map(liga => (
              <LigaCard key={liga.id} liga={liga} />
            ))}
          </div>
        </div>
      ) : misLigas.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-10 text-center">
          <div className="text-[32px] mb-3">🏆</div>
          <p className="text-[15px] text-on-surface font-medium mb-1">No hay ligas disponibles</p>
          <p className="text-[12px] text-on-surface-variant">
            Cuando un organizador cree una liga, aparecerá aquí.
          </p>
          {puedeCrear && (
            <Link
              href="/ligas/nueva"
              className="inline-block mt-4 text-[13px] text-accent hover:underline"
            >
              Crear la primera liga →
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
