import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { EditarEquipoForm } from '@/components/equipo/EditarEquipoForm';

export default async function EditarEquipoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Verify admin role
  const { data: membresia } = await supabase
    .from('equipo_miembros')
    .select('equipo_id, rol')
    .eq('jugador_id', user.id)
    .eq('rol', 'admin')
    .limit(1)
    .maybeSingle();

  if (!membresia) redirect('/equipo');

  const { data: equipo } = await supabase
    .from('equipos')
    .select('id, nombre, deporte, modalidad, color, ciudad, region, comuna, descripcion, logo_url')
    .eq('id', membresia.equipo_id)
    .maybeSingle();

  if (!equipo) redirect('/equipo');

  return (
    <div className="p-4 sm:p-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/equipo"
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-outline transition-colors text-[18px] flex-shrink-0"
          aria-label="Volver"
        >
          ←
        </Link>
        <div>
          <h1 className="text-[16px] font-bold text-on-surface">Editar equipo</h1>
          <p className="text-[11px] text-outline mt-0.5">
            Solo el administrador puede modificar el perfil del equipo.
          </p>
        </div>
      </div>

      {/* Team avatar preview */}
      <div className="flex items-center gap-3 mb-6 p-3.5 bg-surface-container-low border border-outline-variant rounded-xl">
        <div
          className="w-12 h-12 rounded-xl flex-shrink-0 border-2 overflow-hidden flex items-center justify-center"
          style={{
            background: (equipo as Record<string, unknown>).logo_url ? 'transparent' : `${equipo.color}18`,
            borderColor: `${equipo.color}50`,
          }}
        >
          {(equipo as Record<string, unknown>).logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(equipo as Record<string, unknown>).logo_url as string}
              alt={equipo.nombre}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[16px] font-bold" style={{ color: equipo.color }}>
              {equipo.nombre.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <div className="text-[13px] font-semibold text-on-surface">{equipo.nombre}</div>
          <div className="text-[11px] text-outline">ID: {equipo.id.slice(0, 8)}…</div>
        </div>
      </div>

      <EditarEquipoForm
        equipoId={equipo.id}
        initialData={{
          nombre:      equipo.nombre,
          deporte:     equipo.deporte,
          modalidad:   equipo.modalidad,
          color:       equipo.color ?? '#F5C344',
          ciudad:      equipo.ciudad,
          region:      equipo.region,
          comuna:      equipo.comuna,
          descripcion: equipo.descripcion,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          logo_url:    (equipo as any).logo_url ?? null,
        }}
      />
    </div>
  );
}
