import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

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
      <div className="min-h-screen bg-[#080809] flex items-center justify-center p-4">
        <div className="bg-[#0f0f12] border border-[#1a1a1f] rounded-[14px] p-8 max-w-[380px] w-full text-center">
          <div className="text-[40px] mb-4">❌</div>
          <h1 className="text-[18px] font-medium text-white mb-2">Link inválido</h1>
          <p className="text-[13px] text-[#555]">
            Esta invitación no existe, ya fue usada o expiró.
          </p>
        </div>
      </div>
    );
  }

  const equipo = Array.isArray(invitacion.equipo) ? invitacion.equipo[0] : invitacion.equipo;

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

  const loginUrl = `/login?next=${encodeURIComponent(`/join/${equipoId}/${token}`)}`;

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
    <div className="min-h-screen bg-[#080809] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#1a1a2210 1px, transparent 1px), linear-gradient(90deg, #1a1a2210 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative z-10 bg-[#0f0f12] border border-[#1a1a1f] rounded-[14px] p-8 max-w-[400px] w-full">
        <div className="text-center mb-6">
          <div className="text-[13px] text-[#F5C344] tracking-[0.1em] font-medium uppercase mb-4">
            Invitación de equipo
          </div>
          <div
            className="w-16 h-16 rounded-[14px] flex items-center justify-center text-[24px] font-bold mx-auto mb-4 border-2"
            style={{
              background: `${equipo.color}20`,
              borderColor: equipo.color,
              color: equipo.color,
            }}
          >
            {equipo.nombre.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
          </div>
          <h1 className="text-[22px] font-medium text-white mb-1">{equipo.nombre}</h1>
          <p className="text-[13px] text-[#555]">
            {DEPORTE_LABELS[equipo.deporte] ?? equipo.deporte} {equipo.modalidad} · {equipo.ciudad}
          </p>
        </div>

        <div className="bg-[#111114] border border-[#1a1a1f] rounded-[10px] p-3 mb-6 text-center">
          <p className="text-[12px] text-[#555]">
            Te han invitado a unirte como <span className="text-[#888]">jugador suplente</span>.
            El capitán podrá cambiar tu posición después.
          </p>
        </div>

        {temporadaActiva ? (
          <div className="bg-[#1a1510] border border-[#F5C34440] rounded-[8px] p-4 text-center">
            <p className="text-[13px] text-[#F5C344] font-medium mb-1">Temporada en curso</p>
            <p className="text-[12px] text-[#666]">
              No es posible unirse a un equipo una vez que la temporada ya comenzó.
            </p>
          </div>
        ) : user ? (
          <form action={aceptar}>
            <button
              type="submit"
              className="w-full bg-[#F5C344] text-[#080809] border-none rounded-[8px] py-3.5 text-[14px] font-medium cursor-pointer hover:bg-[#e8b53d] transition-colors"
            >
              Aceptar e ingresar al equipo
            </button>
          </form>
        ) : (
          <a
            href={loginUrl}
            className="w-full bg-[#F5C344] text-[#080809] rounded-[8px] py-3.5 text-[14px] font-medium text-center block hover:bg-[#e8b53d] transition-colors"
          >
            Iniciar sesión para aceptar
          </a>
        )}

        <p className="text-center text-[11px] text-[#333] mt-4">
          Esta invitación expira en 48 horas desde que fue creada.
        </p>
      </div>
    </div>
  );
}
