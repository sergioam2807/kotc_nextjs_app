import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const DEPORTE_LABELS: Record<string, string> = {
  basketball: 'Basketball',
  futbol: 'Fútbol',
  voleibol: 'Voleibol',
  tenis: 'Tenis',
  padel: 'Pádel',
};

interface Props {
  params: Promise<{ equipoId: string; token: string }>;
}

/** Shell compartido: mismo fondo con grilla + card centrada que login/onboarding. */
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(color-mix(in oklab, var(--color-outline-variant) 55%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--color-outline-variant) 55%, transparent) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative z-10 bg-surface-container-low border border-outline-variant rounded-2xl p-8 max-w-[400px] w-full">
        {children}
      </div>
    </div>
  );
}

/** Estado sin salida real (link inválido, expirado, temporada cerrada): siempre con una acción clara. */
function DeadEndState({
  emoji,
  title,
  body,
  loggedIn,
}: {
  emoji: string;
  title: string;
  body: string;
  loggedIn: boolean;
}) {
  return (
    <div className="text-center">
      <div className="text-[40px] mb-4">{emoji}</div>
      <h1 className="text-[18px] font-medium text-on-surface mb-2">{title}</h1>
      <p className="text-[13px] text-on-surface-variant mb-6 leading-relaxed">{body}</p>
      <Link
        href="/equipos"
        className="w-full min-h-11 flex items-center justify-center bg-accent text-on-accent rounded-lg text-[14px] font-medium hover:brightness-95 transition-all mb-3"
      >
        Buscar equipos →
      </Link>
      <Link
        href={loggedIn ? '/dashboard' : '/'}
        className="w-full min-h-11 flex items-center justify-center text-[13px] text-on-surface-variant hover:text-on-surface transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
}

export default async function JoinPage({ params }: Props) {
  const { equipoId, token } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: invitacion } = await supabase
    .from('invitaciones')
    .select('id, equipo_id, estado, expira_at, equipo:equipos(id, nombre, deporte, modalidad, ciudad, color, temporada_id)')
    .eq('equipo_id', equipoId)
    .eq('token', token)
    .eq('estado', 'pendiente')
    .maybeSingle();

  if (!invitacion) {
    return (
      <PageShell>
        <DeadEndState
          emoji="🔗"
          title="Invitación no encontrada"
          body="Este enlace no existe o ya fue usado. Pídele al capitán del equipo que te envíe uno nuevo."
          loggedIn={!!user}
        />
      </PageShell>
    );
  }

  const equipo = Array.isArray(invitacion.equipo) ? invitacion.equipo[0] : invitacion.equipo;

  // El check de estado/expira_at en el server action (`aceptar`) es la validación real
  // (TOCTOU-safe). Este chequeo aquí es solo de render: sin él, un token vencido con
  // estado aún 'pendiente' mostraba el formulario de aceptar y, al enviarlo, el usuario
  // simplemente rebotaba a la misma pantalla sin explicación.
  const invitacionExpirada = !!invitacion.expira_at && new Date(invitacion.expira_at) < new Date();

  // Verificar si la temporada ya comenzó (bloquea nuevos ingresos)
  let temporadaActiva = false;
  if (equipo.temporada_id) {
    const { data: temp } = await supabase
      .from('temporadas')
      .select('inicio, activa')
      .eq('id', equipo.temporada_id)
      .maybeSingle();
    if (temp?.activa && new Date(temp.inicio) <= new Date()) {
      temporadaActiva = true;
    }
  }

  // Si está autenticado, verificar si ya es miembro
  if (user) {
    const { data: yaEsMiembro } = await supabase
      .from('equipo_miembros')
      .select('id')
      .eq('equipo_id', equipoId)
      .eq('jugador_id', user.id)
      .maybeSingle();

    if (yaEsMiembro) redirect('/equipo');
  }

  if (invitacionExpirada) {
    return (
      <PageShell>
        <DeadEndState
          emoji="⏰"
          title="Esta invitación expiró"
          body="Los links de invitación duran 48 horas. Pídele al capitán que te envíe uno nuevo."
          loggedIn={!!user}
        />
      </PageShell>
    );
  }

  if (temporadaActiva) {
    return (
      <PageShell>
        <DeadEndState
          emoji="🔒"
          title="Inscripciones cerradas"
          body="Este equipo ya está compitiendo en la temporada actual, así que no se pueden sumar nuevos jugadores por ahora."
          loggedIn={!!user}
        />
      </PageShell>
    );
  }

  const loginUrl = `/login?next=${encodeURIComponent(`/join/${equipoId}/${token}`)}`;
  const iniciales = equipo.nombre.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  async function aceptar() {
    'use server';
    const sb = await createClient();
    const { data: { user: u } } = await sb.auth.getUser();
    if (!u) redirect(`/login?next=${encodeURIComponent(`/join/${equipoId}/${token}`)}`);

    // Re-validate the invitation at action time: it must still be pending and not expired.
    // The page load check is a snapshot; tokens can expire or be revoked between render and submit.
    const { data: invActual } = await sb
      .from('invitaciones')
      .select('id, estado, expira_at')
      .eq('equipo_id', equipoId)
      .eq('token', token)
      .eq('estado', 'pendiente')
      .maybeSingle();

    if (!invActual) {
      // Invitation no longer valid — redirect back so the page re-renders with the error state
      redirect(`/join/${equipoId}/${token}`);
    }

    // Check expiry if the column exists
    if (invActual.expira_at && new Date(invActual.expira_at) < new Date()) {
      redirect(`/join/${equipoId}/${token}`);
    }

    // Re-check the season gate at submit time, not just at page-render time —
    // the season may have started between when the page loaded and now.
    const { data: equipoActual } = await sb
      .from('equipos')
      .select('temporada_id')
      .eq('id', equipoId)
      .maybeSingle();
    if (equipoActual?.temporada_id) {
      const { data: tempActual } = await sb
        .from('temporadas')
        .select('inicio, activa')
        .eq('id', equipoActual.temporada_id)
        .maybeSingle();
      if (tempActual?.activa && new Date(tempActual.inicio) <= new Date()) {
        redirect(`/join/${equipoId}/${token}`);
      }
    }

    // Verificar que no sea ya miembro (doble check server-side)
    const { data: existe } = await sb
      .from('equipo_miembros')
      .select('id')
      .eq('equipo_id', equipoId)
      .eq('jugador_id', u.id)
      .maybeSingle();

    if (!existe) {
      await sb.from('equipo_miembros').insert({
        equipo_id: equipoId,
        jugador_id: u.id,
        rol: 'jugador',
        posicion: 'suplente',
        deporte: equipo.deporte,
      });

      await sb.from('invitaciones')
        .update({ estado: 'aceptada' })
        .eq('equipo_id', equipoId)
        .eq('token', token);
    }

    redirect('/equipo');
  }

  return (
    <PageShell>
      <div className="text-center mb-6">
        <p className="text-[13px] text-on-surface-variant mb-4">Te invitaron a unirte a</p>
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center text-[24px] font-bold mx-auto mb-4 border-2"
          style={{
            background: `${equipo.color}20`,
            borderColor: equipo.color,
            color: equipo.color,
          }}
        >
          {iniciales}
        </div>
        <h1 className="text-[22px] font-medium text-on-surface mb-1">{equipo.nombre}</h1>
        <p className="text-[13px] text-on-surface-variant">
          {DEPORTE_LABELS[equipo.deporte] ?? equipo.deporte} {equipo.modalidad} · {equipo.ciudad}
        </p>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-lg p-3 mb-6 text-center">
        <p className="text-[12px] text-on-surface-variant">
          Te han invitado a unirte como <span className="text-on-surface">jugador suplente</span>.
          El capitán podrá cambiar tu posición después.
        </p>
      </div>

      {user ? (
        <form action={aceptar}>
          <button
            type="submit"
            className="w-full min-h-11 bg-accent text-on-accent border-none rounded-lg text-[14px] font-medium cursor-pointer hover:brightness-95 transition-all"
          >
            Aceptar e ingresar al equipo
          </button>
        </form>
      ) : (
        <Link
          href={loginUrl}
          className="w-full min-h-11 flex items-center justify-center bg-accent text-on-accent rounded-lg text-[14px] font-medium hover:brightness-95 transition-all"
        >
          Iniciar sesión para aceptar
        </Link>
      )}

      <p className="text-center text-[11px] text-outline mt-4">
        Esta invitación expira 48 horas después de haber sido creada.
      </p>
    </PageShell>
  );
}
