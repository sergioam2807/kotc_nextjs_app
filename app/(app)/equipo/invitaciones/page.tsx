import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { InvitacionForm } from '@/components/equipo/InvitacionForm';
import { Badge } from '@/components/ui/Badge';

export default async function InvitacionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Obtener equipo del usuario
  const { data: membresias } = await supabase
    .from('equipo_miembros')
    .select('rol, equipo:equipos(id, nombre, deporte, modalidad)')
    .eq('jugador_id', user.id)
    .limit(1);

  const miEquipo = membresias?.[0];
  if (!miEquipo || !miEquipo.equipo) redirect('/equipo');

  const equipo = Array.isArray(miEquipo.equipo) ? miEquipo.equipo[0] : miEquipo.equipo;

  // Solo admins pueden gestionar invitaciones
  const isAdmin = miEquipo.rol === 'admin';
  if (!isAdmin) redirect('/equipo');

  // Obtener o crear invitación de tipo link
  let linkToken: string | undefined;
  const { data: linkExistente } = await supabase
    .from('invitaciones')
    .select('token')
    .eq('equipo_id', equipo.id)
    .eq('metodo', 'link')
    .maybeSingle();

  if (linkExistente) {
    linkToken = linkExistente.token;
  } else {
    const { data: nuevaInv } = await supabase
      .from('invitaciones')
      .insert({
        equipo_id: equipo.id,
        invitado_por: user.id,
        metodo: 'link',
        estado: 'pendiente',
      })
      .select('token')
      .single();
    linkToken = nuevaInv?.token;
  }

  // Invitaciones pendientes del equipo (email + whatsapp)
  const { data: pendientes } = await supabase
    .from('invitaciones')
    .select('id, email, telefono, metodo, estado, created_at')
    .eq('equipo_id', equipo.id)
    .eq('estado', 'pendiente')
    .neq('metodo', 'link')
    .order('created_at', { ascending: false });

  const formatFecha = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs}h`;
    return `Hace ${Math.floor(hrs / 24)}d`;
  };

  return (
    <div className="p-5 max-w-2xl">
      <h1 className="text-[18px] font-medium text-white mb-1">Invitar jugadores</h1>
      <p className="text-[13px] text-[#555] mb-6">
        Invita nuevos jugadores a <span className="text-[#888]">{equipo.nombre}</span> por email, WhatsApp o link copiable.
      </p>

      <InvitacionForm equipoId={equipo.id} linkToken={linkToken} />

      <div className="mt-6">
        <div className="text-[10px] text-[#333] tracking-[0.08em] mb-3 font-medium uppercase">
          Invitaciones pendientes ({pendientes?.length ?? 0})
        </div>

        {!pendientes?.length ? (
          <div className="bg-[#0f0f12] border border-[#1a1a1f] rounded-[12px] p-6 text-center">
            <div className="text-[13px] text-[#444]">No hay invitaciones pendientes</div>
          </div>
        ) : (
          <div className="bg-[#0f0f12] border border-[#1a1a1f] rounded-[12px] overflow-hidden">
            {pendientes.map((inv, i) => {
              const contacto = inv.email ?? inv.telefono ?? '—';
              return (
                <div
                  key={inv.id}
                  className={`flex items-center gap-2.5 px-4 py-3 ${i < pendientes.length - 1 ? 'border-b border-[#1a1a1f]' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-[#888] truncate">{contacto}</div>
                    <div className="text-[10px] text-[#444] mt-0.5">
                      {inv.metodo} · {formatFecha(inv.created_at)}
                    </div>
                  </div>
                  <Badge variant="neutral">Esperando</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
