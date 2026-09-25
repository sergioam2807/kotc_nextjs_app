import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// GET /api/jugadores/buscar?q=
// Búsqueda liviana de jugadores por username/display_name, para el selector
// "🔍 Buscar jugador KOTC" del armado de equipo en Partido Rápido. A
// diferencia de /jugadores (que solo lista disponibles para reclutamiento),
// esto busca sobre cualquier perfil — un compañero de pickup puede ya tener
// equipo y aun así sumarse a un trío improvisado por un partido.
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();

  if (q.length < 2) {
    return NextResponse.json({ jugadores: [] });
  }
  if (q.length > 50) {
    return NextResponse.json({ error: 'Búsqueda demasiado larga' }, { status: 400 });
  }

  // Escapar comodines de ilike para que el texto del usuario no altere el patrón.
  const safe = q.replace(/[%_]/g, ch => `\\${ch}`);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, nivel')
    .neq('id', user.id)
    .or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`)
    .order('nivel', { ascending: false })
    .limit(8);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ jugadores: data ?? [] });
}
