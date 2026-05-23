import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: miembro } = await supabase
    .from('equipo_miembros')
    .select('equipo_id')
    .eq('jugador_id', user.id)
    .limit(1)
    .maybeSingle();

  const equipoId = miembro?.equipo_id ?? null;

  const body = await request.json();
  const { estado } = body;

  // [C-4] Only allow states that should be settable via this endpoint.
  // 'resultado_pendiente', 'disputado', 'completado' are managed exclusively
  // by /api/resultados which contains the XP + cancha_dominio logic.
  if (!['aceptado', 'rechazado', 'jugado'].includes(estado)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  }

  const { data: desafio, error: fetchError } = await supabase
    .from('desafios')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!desafio) return NextResponse.json({ error: 'Desafío no encontrado' }, { status: 404 });

  if ((estado === 'aceptado' || estado === 'rechazado')) {
    if (desafio.equipo_retado_id !== equipoId || desafio.estado !== 'pendiente') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
  }

  if (estado === 'jugado') {
    const esParticipante = equipoId === desafio.equipo_retador_id || equipoId === desafio.equipo_retado_id;
    if (!esParticipante || desafio.estado !== 'aceptado') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
  }

  const { data: updatedData, error: updateError } = await supabase
    .from('desafios')
    .update({ estado })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ desafio: updatedData });
}
