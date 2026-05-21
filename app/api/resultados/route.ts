import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json();
  const { data: resultado, error } = await supabase
    .from('resultados')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('desafios').update({ estado: 'jugado' }).eq('id', body.desafio_id);

  const xpGanador = 50;
  await supabase.rpc('add_team_xp', { team_id: body.ganador_id, amount: xpGanador });

  return NextResponse.json(resultado, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { id, campo } = await request.json();
  const update: Record<string, boolean> = {};
  update[campo] = true;

  const { data, error } = await supabase
    .from('resultados')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
