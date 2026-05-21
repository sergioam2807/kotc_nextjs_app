import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: miembro } = await supabase
    .from('equipo_miembros')
    .select('equipo_id')
    .eq('jugador_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!miembro) return NextResponse.json({ desafios: [] });

  const equipoId = miembro.equipo_id;

  const { data: desafiosRaw, error } = await supabase
    .from('desafios')
    .select('*')
    .or(`equipo_retador_id.eq.${equipoId},equipo_retado_id.eq.${equipoId}`)
    .order('fecha', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const equipoIds = [...new Set(desafiosRaw.flatMap(d => [d.equipo_retador_id, d.equipo_retado_id]))];
  const canchaIds = [...new Set(desafiosRaw.map(d => d.cancha_id).filter(Boolean))];

  const [{ data: equipos }, { data: canchas }] = await Promise.all([
    supabase.from('equipos').select('id, nombre, color').in('id', equipoIds),
    canchaIds.length
      ? supabase.from('canchas').select('id, nombre, direccion').in('id', canchaIds)
      : Promise.resolve({ data: [] }),
  ]);

  const equipoMap = Object.fromEntries((equipos ?? []).map(e => [e.id, e]));
  const canchaMap = Object.fromEntries((canchas ?? []).map(c => [c.id, c]));

  const desafios = desafiosRaw.map(d => ({
    ...d,
    equipo_retador: equipoMap[d.equipo_retador_id] ?? null,
    equipo_retado: equipoMap[d.equipo_retado_id] ?? null,
    cancha: canchaMap[d.cancha_id] ?? null,
  }));

  return NextResponse.json({ desafios, equipoId });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: miembro } = await supabase
    .from('equipo_miembros')
    .select('equipo_id')
    .eq('jugador_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!miembro) return NextResponse.json({ error: 'No perteneces a ningún equipo' }, { status: 400 });

  const equipoId = miembro.equipo_id;
  const body = await request.json();
  const { equipo_retado_id, cancha_id, deporte, formato, fecha, mensaje } = body;

  if (!equipo_retado_id || !cancha_id || !deporte || !formato || !fecha) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  if (equipo_retado_id === equipoId) {
    return NextResponse.json({ error: 'No puedes desafiar a tu propio equipo' }, { status: 400 });
  }

  const { data: inserted, error } = await supabase
    .from('desafios')
    .insert({
      equipo_retador_id: equipoId,
      equipo_retado_id,
      cancha_id,
      deporte,
      formato,
      fecha: new Date(fecha).toISOString(),
      mensaje: mensaje ?? null,
      estado: 'pendiente',
    })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const [{ data: equipos }, { data: canchas }] = await Promise.all([
    supabase.from('equipos').select('id, nombre, color').in('id', [equipoId, equipo_retado_id]),
    supabase.from('canchas').select('id, nombre, direccion').eq('id', cancha_id),
  ]);

  const equipoMap = Object.fromEntries((equipos ?? []).map(e => [e.id, e]));
  const canchaMap = Object.fromEntries((canchas ?? []).map(c => [c.id, c]));

  const desafio = {
    ...inserted,
    equipo_retador: equipoMap[inserted!.equipo_retador_id] ?? null,
    equipo_retado: equipoMap[inserted!.equipo_retado_id] ?? null,
    cancha: canchaMap[inserted!.cancha_id] ?? null,
  };

  return NextResponse.json({ desafio }, { status: 201 });
}
