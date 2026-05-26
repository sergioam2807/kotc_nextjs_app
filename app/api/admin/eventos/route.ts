import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function isAdmin(email: string | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL ?? '';
  return !!(email && adminEmail && email === adminEmail);
}

const VALID_TIPOS = [
  'torneo_express', 'bonus_xp', 'cancha_especial',
  'nightball', 'king_challenge', 'reto_semanal', 'otro',
] as const;

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

// GET /api/admin/eventos — list all events
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('eventos')
    .select('id, nombre, descripcion, tipo, fecha_inicio, fecha_fin, activo, color, emoji, premio, reglas, bonus_xp_mult, created_at')
    .order('fecha_inicio', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ eventos: data ?? [] });
}

// POST /api/admin/eventos — create event
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  let body: {
    nombre?: string;
    descripcion?: string | null;
    tipo?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    activo?: boolean;
    color?: string | null;
    emoji?: string | null;
    premio?: string | null;
    reglas?: string | null;
    bonus_xp_mult?: number | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { nombre, descripcion, tipo, fecha_inicio, fecha_fin, activo, color, emoji, premio, reglas, bonus_xp_mult } = body;

  if (!nombre?.trim()) return NextResponse.json({ error: 'El nombre es requerido.' }, { status: 400 });
  if (!tipo || !VALID_TIPOS.includes(tipo as typeof VALID_TIPOS[number])) {
    return NextResponse.json({ error: 'Tipo de evento inválido.' }, { status: 400 });
  }
  if (!fecha_inicio || !fecha_fin) {
    return NextResponse.json({ error: 'Las fechas de inicio y fin son requeridas.' }, { status: 400 });
  }
  if (new Date(fecha_fin) <= new Date(fecha_inicio)) {
    return NextResponse.json({ error: 'La fecha de fin debe ser posterior al inicio.' }, { status: 400 });
  }
  if (color && !HEX_REGEX.test(color)) {
    return NextResponse.json({ error: 'Color inválido (debe ser hex #rrggbb).' }, { status: 400 });
  }
  if (bonus_xp_mult !== null && bonus_xp_mult !== undefined) {
    if (typeof bonus_xp_mult !== 'number' || bonus_xp_mult < 1 || bonus_xp_mult > 10) {
      return NextResponse.json({ error: 'Multiplicador XP debe estar entre 1 y 10.' }, { status: 400 });
    }
  }

  const { data: evento, error } = await supabase
    .from('eventos')
    .insert({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() ?? null,
      tipo,
      fecha_inicio,
      fecha_fin,
      activo: activo ?? true,
      color: color ?? null,
      emoji: emoji?.trim() ?? null,
      premio: premio?.trim() ?? null,
      reglas: reglas?.trim() ?? null,
      bonus_xp_mult: bonus_xp_mult ?? null,
    })
    .select('id, nombre, tipo, fecha_inicio, fecha_fin, activo, color, emoji, premio')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ evento }, { status: 201 });
}
