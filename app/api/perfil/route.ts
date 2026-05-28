import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_FIELDS = [
  'bio',
  'posicion_principal',
  'posiciones_adicionales',
  'especialidades',
  'altura_cm',
  'peso_kg',
  'mano_habil',
  'anos_experiencia',
  'disponible_reclutamiento',
  'ciudad',
  'display_name',
  'region',
  'comuna',
];

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 });
  }

  // Type and range validation per field
  if ('bio' in updates && updates.bio !== null) {
    if (typeof updates.bio !== 'string' || updates.bio.length > 400) {
      return NextResponse.json({ error: 'bio inválida (máx 400 caracteres)' }, { status: 400 });
    }
  }
  if ('display_name' in updates && updates.display_name !== null) {
    if (typeof updates.display_name !== 'string' || updates.display_name.trim().length === 0 || updates.display_name.length > 60) {
      return NextResponse.json({ error: 'display_name inválido (1–60 caracteres)' }, { status: 400 });
    }
  }
  if ('ciudad' in updates && updates.ciudad !== null) {
    if (typeof updates.ciudad !== 'string' || updates.ciudad.length > 100) {
      return NextResponse.json({ error: 'ciudad inválida (máx 100 caracteres)' }, { status: 400 });
    }
  }
  if ('region' in updates && updates.region !== null) {
    if (typeof updates.region !== 'string' || updates.region.trim().length === 0 || updates.region.length > 100) {
      return NextResponse.json({ error: 'region inválida (máx 100 caracteres)' }, { status: 400 });
    }
  }
  if ('comuna' in updates && updates.comuna !== null) {
    if (typeof updates.comuna !== 'string' || updates.comuna.trim().length === 0 || updates.comuna.length > 100) {
      return NextResponse.json({ error: 'comuna inválida (máx 100 caracteres)' }, { status: 400 });
    }
  }
  if ('altura_cm' in updates && updates.altura_cm !== null) {
    const h = updates.altura_cm;
    if (typeof h !== 'number' || !Number.isInteger(h) || h < 100 || h > 250) {
      return NextResponse.json({ error: 'altura_cm inválida (100–250 cm)' }, { status: 400 });
    }
  }
  if ('peso_kg' in updates && updates.peso_kg !== null) {
    const w = updates.peso_kg;
    if (typeof w !== 'number' || !Number.isInteger(w) || w < 30 || w > 300) {
      return NextResponse.json({ error: 'peso_kg inválido (30–300 kg)' }, { status: 400 });
    }
  }
  if ('anos_experiencia' in updates && updates.anos_experiencia !== null) {
    const exp = updates.anos_experiencia;
    if (typeof exp !== 'number' || !Number.isInteger(exp) || exp < 0 || exp > 50) {
      return NextResponse.json({ error: 'anos_experiencia inválido (0–50)' }, { status: 400 });
    }
  }
  if ('disponible_reclutamiento' in updates && updates.disponible_reclutamiento !== null) {
    if (typeof updates.disponible_reclutamiento !== 'boolean') {
      return NextResponse.json({ error: 'disponible_reclutamiento debe ser boolean' }, { status: 400 });
    }
  }
  if ('posiciones_adicionales' in updates && updates.posiciones_adicionales !== null) {
    if (!Array.isArray(updates.posiciones_adicionales) || updates.posiciones_adicionales.length > 10) {
      return NextResponse.json({ error: 'posiciones_adicionales inválido' }, { status: 400 });
    }
  }
  if ('especialidades' in updates && updates.especialidades !== null) {
    if (!Array.isArray(updates.especialidades) || updates.especialidades.length > 10) {
      return NextResponse.json({ error: 'especialidades inválido' }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
