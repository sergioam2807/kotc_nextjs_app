import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function isAdmin(email: string | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL ?? '';
  return !!(email && adminEmail && email === adminEmail);
}

// GET /api/admin/temporadas — list all seasons
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('temporadas')
    .select('id, nombre, descripcion, deporte, deporte_filter, inicio, fin, activa, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ temporadas: data ?? [] });
}

// POST /api/admin/temporadas — create a new season
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  let body: {
    nombre?: string;
    descripcion?: string | null;
    inicio?: string;
    fin?: string;
    deporte_filter?: string[] | null;
    activa?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { nombre, descripcion, inicio, fin, deporte_filter, activa } = body;

  if (!nombre?.trim()) {
    return NextResponse.json({ error: 'El nombre es requerido.' }, { status: 400 });
  }
  if (!inicio || !fin) {
    return NextResponse.json({ error: 'Las fechas inicio y fin son requeridas.' }, { status: 400 });
  }
  if (new Date(fin) <= new Date(inicio)) {
    return NextResponse.json({ error: 'La fecha de fin debe ser posterior al inicio.' }, { status: 400 });
  }

  // If activating, deactivate all others first
  if (activa) {
    await supabase
      .from('temporadas')
      .update({ activa: false })
      .eq('activa', true);
  }

  const { data: temporada, error } = await supabase
    .from('temporadas')
    .insert({
      nombre: nombre.trim(),
      descripcion: descripcion ?? null,
      inicio,
      fin,
      deporte: deporte_filter?.[0] ?? null,          // keep legacy deporte col in sync
      deporte_filter: deporte_filter ?? null,
      activa: activa ?? false,
    })
    .select('id, nombre, descripcion, deporte, deporte_filter, inicio, fin, activa')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ temporada }, { status: 201 });
}
